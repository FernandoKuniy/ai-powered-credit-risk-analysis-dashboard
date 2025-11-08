# backend/app.py
import os, json, joblib
import logging
import pandas as pd
import numpy as np
import shap
from fastapi import FastAPI, HTTPException, Depends, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from schemas import ScoreRequest, ScoreResponse, SaveApplicationRequest, SaveApplicationResponse
from supabase import create_client, Client
from typing import Dict, Any, List
from dotenv import load_dotenv

# Load environment variables from .env.local file
load_dotenv("../.env.local")

# Configure logging
# Allow log level to be configured via environment variable (default: WARNING for production)
LOG_LEVEL = os.getenv("LOG_LEVEL", "WARNING").upper()
log_level = getattr(logging, LOG_LEVEL, logging.WARNING)

logging.basicConfig(
    level=log_level,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Suppress verbose logging from third-party libraries
# HTTP/Network libraries
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("hpack").setLevel(logging.WARNING)
logging.getLogger("hpack.hpack").setLevel(logging.WARNING)
logging.getLogger("hpack.table").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)
logging.getLogger("urllib3.connectionpool").setLevel(logging.WARNING)
logging.getLogger("requests").setLevel(logging.WARNING)
logging.getLogger("requests.packages.urllib3").setLevel(logging.WARNING)

# Supabase/PostgREST libraries
logging.getLogger("supabase").setLevel(logging.WARNING)
logging.getLogger("postgrest").setLevel(logging.WARNING)
logging.getLogger("realtime").setLevel(logging.WARNING)
logging.getLogger("storage").setLevel(logging.WARNING)

# Data science libraries
logging.getLogger("pandas").setLevel(logging.WARNING)
logging.getLogger("numpy").setLevel(logging.WARNING)
logging.getLogger("shap").setLevel(logging.WARNING)

# Other common libraries
logging.getLogger("joblib").setLevel(logging.WARNING)
logging.getLogger("fastapi").setLevel(logging.WARNING)
logging.getLogger("uvicorn").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

app = FastAPI()

# --- Rate Limiting ---
# Initialize rate limiter (uses IP address for identification)
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Rate limit configuration (can be overridden via environment variables)
SCORE_RATE_LIMIT = os.getenv("SCORE_RATE_LIMIT", "30/minute")
PORTFOLIO_RATE_LIMIT = os.getenv("PORTFOLIO_RATE_LIMIT", "60/minute")

# --- CORS: allow local dev + configurable prod origins ---
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS").split(",")
ALLOWED_ORIGINS = [o.strip() for o in ALLOWED_ORIGINS if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # e.g. "https://your-frontend.vercel.app"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API key guard ---
API_KEY = os.getenv("API_KEY")
if not API_KEY:
    raise ValueError("API_KEY environment variable is required")

def require_key(x_api_key: str | None = Header(default=None)):
    if not x_api_key or x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

THRESHOLD = 0.15  # approval cutoff on PD

# ---- Supabase client ----
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

# Validate JWT secret configuration at startup
if not SUPABASE_JWT_SECRET:
    logger.warning(
        "SUPABASE_JWT_SECRET is not configured. JWT verification will be disabled. "
        "This is not recommended for production. User authentication will rely on Supabase RLS policies."
    )
else:
    logger.info("SUPABASE_JWT_SECRET is configured. JWT verification is enabled.")

def get_supabase_client(user_jwt: str | None = None) -> Client | None:
    """Create a Supabase client with optional user JWT for RLS enforcement"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    
    if user_jwt:
        # Create client with user's JWT for RLS enforcement
        from supabase.lib.client_options import ClientOptions
        options = ClientOptions(
            headers={
                "Authorization": f"Bearer {user_jwt}"
            }
        )
        return create_client(SUPABASE_URL, SUPABASE_KEY, options)
    else:
        # Fallback to basic client (operations will fail if RLS requires auth)
        return create_client(SUPABASE_URL, SUPABASE_KEY)

# JWT verification function
def verify_supabase_jwt(token: str) -> dict | None:
    """
    Verify Supabase JWT token and return payload if valid.
    
    Returns:
        dict: Token payload if valid
        None: If verification fails (with appropriate logging)
    """
    if not SUPABASE_JWT_SECRET:
        logger.warning("JWT verification attempted but SUPABASE_JWT_SECRET is not configured")
        return None
    
    try:
        import jwt
        payload = jwt.decode(
            token, 
            SUPABASE_JWT_SECRET, 
            algorithms=["HS256"],
            audience="authenticated"
        )
        return payload
    except jwt.ExpiredSignatureError:
        logger.debug("JWT token has expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"JWT token is invalid: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error during JWT verification: {str(e)}")
        return None

def get_user_id_from_token(authorization: str | None) -> tuple[str | None, bool]:
    """
    Extract user ID from JWT token and verify validity.
    
    Returns:
        tuple: (user_id, is_valid_token)
            - user_id: Extracted user ID if token is valid, None otherwise
            - is_valid_token: True if token was successfully verified, False otherwise
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None, False
    
    try:
        token = authorization.split(" ")[1]
        
        # If JWT secret is not configured, we cannot verify tokens
        if not SUPABASE_JWT_SECRET:
            logger.debug("Cannot verify JWT token: SUPABASE_JWT_SECRET not configured")
            return None, False
        
        payload = verify_supabase_jwt(token)
        
        if payload:
            user_id = payload.get("sub")
            if user_id:
                return user_id, True
            else:
                logger.warning("JWT payload missing 'sub' (user ID) field")
                return None, False
        else:
            # Token verification failed (logged in verify_supabase_jwt)
            return None, False
    except Exception as e:
        logger.error(f"Error extracting user ID from token: {str(e)}")
        return None, False

# ---- Load artifacts at startup ----
MODEL_PATH = "models/model.pkl"
CALIBRATED_MODEL_PATH = "models/model_calibrated.pkl"
META_PATH = "models/feature_meta.json"

model = None
calibrated_model = None
feature_order: list[str] | None = None
shap_explainer = None
background_data = None  # Sample of training data for SHAP

def _load_artifacts():
    global model, calibrated_model, feature_order, shap_explainer, background_data
    if not os.path.exists(MODEL_PATH):
        return False
    model = joblib.load(MODEL_PATH)
    
    # Load calibrated model if available
    if os.path.exists(CALIBRATED_MODEL_PATH):
        calibrated_model = joblib.load(CALIBRATED_MODEL_PATH)
        logger.info("Calibrated model loaded successfully")
    else:
        logger.warning("Calibrated model not found, using base model")
        calibrated_model = None
    
    with open(META_PATH) as f:
        meta = json.load(f)
        feature_order = meta["feature_order"]
    
    # Initialize SHAP explainer with background data
    # For XGBoost, we can use TreeExplainer which is fast
    try:
        # If calibrated model exists, use its base estimator for SHAP
        # This ensures SHAP explains the same model that makes predictions
        if calibrated_model is not None:
            # CalibratedClassifierCV wraps the base XGBoost model
            # Try different attribute names (varies by sklearn version)
            if hasattr(calibrated_model, 'base_estimator'):
                xgb_model = calibrated_model.base_estimator
            elif hasattr(calibrated_model, 'estimator'):
                xgb_model = calibrated_model.estimator
            elif hasattr(calibrated_model, 'base_estimator_'):
                xgb_model = calibrated_model.base_estimator_
            else:
                logger.warning("Could not find base estimator in calibrated model, falling back to pipeline model")
                xgb_model = model.named_steps['clf']
            logger.info(f"Using base model from calibrated wrapper for SHAP (type: {type(xgb_model)})")
        else:
            # Fall back to base model from pipeline
            xgb_model = model.named_steps['clf']
            logger.info("Using base model from pipeline for SHAP")
        
        shap_explainer = shap.TreeExplainer(xgb_model)
        logger.info("SHAP explainer initialized successfully")
    except Exception as e:
        logger.warning(f"Failed to initialize SHAP explainer: {str(e)}. Explanations will not be available.", exc_info=True)
        shap_explainer = None
    
    return True

_loaded = _load_artifacts()

def _risk_grade(pd_val: float) -> str:
    if pd_val < 0.05:  return "A"
    if pd_val < 0.10:  return "B"
    if pd_val < 0.20:  return "C"
    if pd_val < 0.30:  return "D"
    if pd_val < 0.40:  return "E"
    if pd_val < 0.60:  return "F"
    return "G"

def _format_feature_name(feat_name: str) -> str:
    """Format feature names for display with proper acronyms and capitalization."""
    # Mapping for proper feature name formatting
    feature_name_map = {
        'dti': 'DTI',
        'fico': 'FICO',
        'loan_amnt': 'Loan Amount',
        'annual_inc': 'Annual Income',
        'emp_length': 'Employment Length',
        'revol_util': 'Revolving Utilization',
        'loan_to_income': 'Loan-to-Income Ratio',
        'fico_dti_interaction': 'FICO-DTI Interaction',
        'revol_util_squared': 'Revolving Utilization²',
        'annual_inc_log': 'Log Annual Income',
        'dti_bucket': 'DTI Bucket',
        'fico_bucket': 'FICO Bucket',
        'lti_bucket': 'Loan-to-Income Bucket',
        'emp_stability': 'Employment Stability',
        'fico_grade_interaction': 'FICO-Grade Interaction',
        'dti_revol_interaction': 'DTI-Revolving Interaction',
        'income_term_interaction': 'Income-Term Interaction',
        'loan_purpose_risk': 'Loan Purpose Risk',
        'fico_squared': 'FICO²',
        'dti_squared': 'DTI²',
        'loan_amnt_squared': 'Loan Amount²',
        'income_per_year_employed': 'Income per Year Employed',
        'debt_service_ratio': 'Debt Service Ratio',
        'credit_utilization_ratio': 'Credit Utilization Ratio',
        'grade': 'Grade',
        'term': 'Term',
        'purpose': 'Purpose',
        'home_ownership': 'Home Ownership',
        'state': 'State'
    }
    return feature_name_map.get(feat_name, feat_name.replace('_', ' ').title())


def _format_feature_value(feat_name: str, value: any) -> str:
    """Format feature values with appropriate units and formatting."""
    if pd.isna(value):
        return "N/A"
    
    # Format based on feature type
    if feat_name == 'loan_amnt':
        return f"${value:,.0f}"
    elif feat_name == 'annual_inc':
        return f"${value:,.0f}"
    elif feat_name in ['dti', 'revol_util']:
        return f"{value:.1f}%"
    elif feat_name == 'fico':
        return f"{int(value)}"
    elif feat_name == 'emp_length':
        return f"{int(value)} years"
    elif feat_name in ['grade', 'term', 'purpose', 'home_ownership', 'state']:
        return str(value)
    else:
        # For engineered features, return formatted number
        if isinstance(value, (int, float)):
            return f"{value:.2f}"
        return str(value)


def _compute_shap_explanation(df: pd.DataFrame, pd_value: float) -> Dict[str, Any] | None:
    """
    Compute SHAP values for a given prediction and return top contributing features.
    
    Args:
        df: DataFrame with single row (raw input features before preprocessing)
        pd_value: Predicted probability of default
        
    Returns:
        Dictionary with explanation data or None if SHAP is unavailable
    """
    if shap_explainer is None or model is None:
        return None
    
    try:
        # Get original feature values from the input DataFrame
        # Store original values before any transformations
        original_values = {}
        if len(df) > 0:
            for col in df.columns:
                try:
                    val = df[col].iloc[0]
                    original_values[col] = val if not pd.isna(val) else None
                except (KeyError, IndexError):
                    original_values[col] = None
        
        # Transform input through preprocessing pipeline
        # ColumnTransformer expects: all numerical features first, then all categorical
        preprocessor = model.named_steps['pre']
        num_cols = [
            # Original features
            "loan_amnt", "annual_inc", "dti", "emp_length", "revol_util", "fico",
            # Existing engineered features
            "loan_to_income", "fico_dti_interaction", "revol_util_squared", "annual_inc_log",
            # Risk bucket features
            "dti_bucket", "fico_bucket", "lti_bucket", "emp_stability",
            # Interaction features
            "fico_grade_interaction", "dti_revol_interaction", "income_term_interaction", "loan_purpose_risk",
            # Polynomial features
            "fico_squared", "dti_squared", "loan_amnt_squared",
            # Ratio and normalized features
            "income_per_year_employed", "debt_service_ratio", "credit_utilization_ratio"
        ]
        cat_cols = ["grade", "term", "purpose", "home_ownership", "state"]
        expected_order = num_cols + cat_cols
        df_ordered = df[expected_order]
        
        transformed_df = preprocessor.transform(df_ordered)
        
        # Compute SHAP values on transformed features
        shap_values = shap_explainer.shap_values(transformed_df)
        
        # For binary classification, get values for positive class (default=1)
        if isinstance(shap_values, list):
            shap_values = shap_values[1]  # Get values for positive class
        
        shap_values = np.array(shap_values)
        if shap_values.ndim > 1:
            shap_values = shap_values[0]  # Get single row
        
        shap_aggregated = {}
        
        # Process numeric features (6 original + 4 existing engineered + 15 enhanced features = 25 total)
        numeric_features = [
            # Original features
            'loan_amnt', 'annual_inc', 'dti', 'emp_length', 'revol_util', 'fico',
            # Existing engineered features
            'loan_to_income', 'fico_dti_interaction', 'revol_util_squared', 'annual_inc_log',
            # Risk bucket features
            'dti_bucket', 'fico_bucket', 'lti_bucket', 'emp_stability',
            # Interaction features
            'fico_grade_interaction', 'dti_revol_interaction', 'income_term_interaction', 'loan_purpose_risk',
            # Polynomial features
            'fico_squared', 'dti_squared', 'loan_amnt_squared',
            # Ratio and normalized features
            'income_per_year_employed', 'debt_service_ratio', 'credit_utilization_ratio'
        ]
        
        for i, feat_name in enumerate(numeric_features):
            if i < len(shap_values):
                shap_aggregated[feat_name] = float(shap_values[i])
        
        # Process categorical features (one-hot encoded)
        # We need to aggregate one-hot encoded SHAP values back to original features
        cat_start_idx = len(numeric_features)
        cat_transformer = preprocessor.named_transformers_['cat']
        
        # Get actual one-hot feature names
        try:
            if hasattr(cat_transformer, 'get_feature_names_out'):
                cat_feature_names = cat_transformer.get_feature_names_out(['grade', 'term', 'purpose', 'home_ownership', 'state'])
            else:
                # Fallback: determine number of categorical features
                n_cat_features = len(shap_values) - len(numeric_features)
                cat_feature_names = [f"cat_{i}" for i in range(n_cat_features)]
        except:
            n_cat_features = len(shap_values) - len(numeric_features)
            cat_feature_names = [f"cat_{i}" for i in range(n_cat_features)]
        
        # Aggregate categorical SHAP values
        cat_features_map = {
            'grade': [],
            'term': [],
            'purpose': [],
            'home_ownership': [],
            'state': []
        }
        
        # Map one-hot encoded names to original features
        for idx, feat_name in enumerate(cat_feature_names):
            global_idx = cat_start_idx + idx
            if global_idx < len(shap_values):
                value = float(shap_values[global_idx])
                if feat_name.startswith('grade_'):
                    cat_features_map['grade'].append(value)
                elif feat_name.startswith('term_'):
                    cat_features_map['term'].append(value)
                elif feat_name.startswith('purpose_'):
                    cat_features_map['purpose'].append(value)
                elif feat_name.startswith('home_ownership_'):
                    cat_features_map['home_ownership'].append(value)
                elif feat_name.startswith('state_'):
                    cat_features_map['state'].append(value)
        
        # Aggregate by summing SHAP values for each categorical feature
        for cat_feat, values in cat_features_map.items():
            if values:
                shap_aggregated[cat_feat] = float(sum(values))
            else:
                shap_aggregated[cat_feat] = 0.0
        
        # Create feature contributions list with proper formatting and original values
        feature_contributions = []
        for feat, shap_val in shap_aggregated.items():
            # Get original value if available
            original_value = original_values.get(feat, None)
            formatted_value = _format_feature_value(feat, original_value) if original_value is not None else None
            
            feature_contributions.append({
                "feature": _format_feature_name(feat),
                "feature_key": feat,  # Keep original key for reference
                "shap_value": float(shap_val),
                "impact": "positive" if shap_val > 0 else "negative",
                "contribution_pct": abs(shap_val) / (abs(pd_value) + 1e-10) * 100 if pd_value > 0 else 0.0,
                "original_value": formatted_value  # Add formatted original value
            })
        
        # Sort by absolute SHAP value, descending
        feature_contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        
        # Return all features (we have 11 total, manageable to show all)
        top_features = feature_contributions
        
        # Normalize contribution percentages based on total absolute contribution
        total_abs_contribution = sum(abs(f["shap_value"]) for f in top_features)
        if total_abs_contribution > 0:
            for feat in top_features:
                feat["contribution_pct"] = (abs(feat["shap_value"]) / total_abs_contribution) * 100
        
        # Create human-readable summary with actual values (use top 3 for summary)
        top_3 = top_features[:3]
        increasing_factors = [f for f in top_3 if f["impact"] == "positive"][:2]
        decreasing_factors = [f for f in top_3 if f["impact"] == "negative"][:2]
        
        summary_parts = []
        if increasing_factors:
            factor_descriptions = []
            for factor in increasing_factors:
                if factor["original_value"]:
                    factor_descriptions.append(f"{factor['feature']} ({factor['original_value']})")
                else:
                    factor_descriptions.append(factor['feature'])
            summary_parts.append(f"{' and '.join(factor_descriptions)} increase risk")
        
        if decreasing_factors:
            factor_descriptions = []
            for factor in decreasing_factors:
                if factor["original_value"]:
                    factor_descriptions.append(f"{factor['feature']} ({factor['original_value']})")
                else:
                    factor_descriptions.append(factor['feature'])
            summary_parts.append(f"{' and '.join(factor_descriptions)} decrease risk")
        
        summary = ". ".join(summary_parts) if summary_parts else "Risk factors analyzed"
        
        return {
            "top_features": top_features,
            "summary": summary
        }
        
    except Exception as e:
        logger.error(f"Error computing SHAP explanation: {type(e).__name__}: {str(e)}", exc_info=True)
        return None

def _compute_portfolio_stats(supabase: Client, user_id: str | None = None) -> dict:
    """
    Compute portfolio statistics using SQL aggregation (fast and efficient).
    Calls PostgreSQL function that performs aggregations in the database.
    
    Returns:
        dict with total_applications, avg_pd, approval_rate, default_rate, grade_distribution
    """
    try:
        # Call PostgreSQL function for SQL-based aggregation
        # This is much faster than fetching all rows and computing in Python
        result = supabase.rpc(
            "compute_portfolio_stats",
            {"p_user_id": user_id}
        ).execute()
        
        if result.data:
            stats = result.data[0]
            # Ensure grade_distribution has all grades (fill missing with 0)
            grade_dist = stats.get("grade_distribution", {})
            for grade in "ABCDEFG":
                if grade not in grade_dist:
                    grade_dist[grade] = 0
            
            return {
                "total_applications": stats.get("total_applications", 0),
                "avg_pd": float(stats.get("avg_pd", 0.0)),
                "approval_rate": float(stats.get("approval_rate", 0.0)),
                "default_rate": float(stats.get("default_rate", 0.0)),
                "grade_distribution": grade_dist
            }
    except Exception as e:
        logger.warning(f"SQL aggregation failed, falling back to Python computation: {str(e)}")
        # Fallback to Python computation if SQL function fails
        # This ensures backward compatibility during migration
    
    # Fallback: Python-based computation (original method)
    # Get total count
    count_query = supabase.table("applications").select("id", count="exact")
    if user_id:
        count_query = count_query.eq("user_id", user_id)
    count_result = count_query.execute()
    total_applications = count_result.count or 0
    
    if total_applications == 0:
        return {
            "total_applications": 0,
            "avg_pd": 0.0,
            "approval_rate": 0.0,
            "default_rate": 0.0,
            "grade_distribution": {"A": 0, "B": 0, "C": 0, "D": 0, "E": 0, "F": 0, "G": 0}
        }
    
    # Get all application data for aggregation
    stats_query = supabase.table("applications").select("pd, risk_grade, decision")
    if user_id:
        stats_query = stats_query.eq("user_id", user_id)
    stats_result = stats_query.execute()
    applications = stats_result.data
    
    # Calculate metrics
    pds = [app["pd"] for app in applications]
    avg_pd = sum(pds) / len(pds) if pds else 0.0
    
    approved_count = sum(1 for app in applications if app["decision"] == "approve")
    approval_rate = approved_count / len(applications) if applications else 0.0
    
    # Grade distribution
    grade_counts = {}
    for grade in "ABCDEFG":
        grade_counts[grade] = sum(1 for app in applications if app["risk_grade"] == grade)
    
    return {
        "total_applications": total_applications,
        "avg_pd": round(avg_pd, 4),
        "approval_rate": round(approval_rate, 4),
        "default_rate": round(avg_pd, 4),  # Using avg PD as proxy for expected default rate
        "grade_distribution": grade_counts
    }

def _get_or_compute_portfolio_stats(supabase: Client, user_id: str | None = None) -> dict:
    """
    Get portfolio stats from database (automatically kept fresh by trigger).
    Falls back to computing if stats don't exist yet.
    
    Since the database trigger automatically updates portfolio_stats when applications
    are inserted, we can trust the database to have fresh data.
    
    Returns:
        dict with portfolio statistics
    """
    # Try to get stats from portfolio_stats table (should be fresh due to trigger)
    if user_id:
        try:
            # Get the stats row, ordered by computed_at to ensure we get the latest
            cached_result = supabase.table("portfolio_stats").select("*").eq("user_id", user_id).order("computed_at", desc=True).limit(1).execute()
            if cached_result.data and len(cached_result.data) > 0:
                stats_row = cached_result.data[0]
                logger.debug(f"Using portfolio stats from database for user {user_id}")
                return {
                    "total_applications": stats_row["total_applications"],
                    "avg_pd": float(stats_row["avg_pd"]),
                    "approval_rate": float(stats_row["approval_rate"]),
                    "default_rate": float(stats_row["default_rate"]),
                    "grade_distribution": stats_row["grade_distribution"]
                }
        except Exception as e:
            logger.debug(f"Failed to fetch portfolio stats from database: {str(e)}")
    
    # Stats don't exist yet (first time user or trigger hasn't run) - compute fresh
    # This also handles the case where user_id is None
    logger.info(f"Computing portfolio stats for user {user_id} (stats not found in database yet)")
    stats = _compute_portfolio_stats(supabase, user_id)
    
    # For user_id=None case, we don't cache (no user context)
    # For user_id with no stats, the trigger will create them on next application insert
    # But we can also proactively create them here as a fallback using the database function
    if user_id:
        try:
            # Use the database RPC function to upsert stats (handles both insert and update)
            supabase.rpc("upsert_portfolio_stats", {"p_user_id": user_id}).execute()
            logger.debug(f"Created/updated portfolio stats for user {user_id} via RPC")
        except Exception as e:
            logger.debug(f"Failed to update portfolio stats via RPC (non-critical): {str(e)}")
            # Fallback: try manual insert/update
            try:
                stats_for_cache = {
                    "user_id": user_id,
                    "total_applications": stats["total_applications"],
                    "avg_pd": stats["avg_pd"],
                    "approval_rate": stats["approval_rate"],
                    "default_rate": stats["default_rate"],
                    "grade_distribution": stats["grade_distribution"],
                    "threshold": THRESHOLD
                }
                update_result = supabase.table("portfolio_stats").update(stats_for_cache).eq("user_id", user_id).execute()
                if not update_result.data or len(update_result.data) == 0:
                    supabase.table("portfolio_stats").insert(stats_for_cache).execute()
                logger.debug(f"Created/updated portfolio stats for user {user_id} via fallback")
            except Exception as e2:
                logger.debug(f"Fallback portfolio stats update also failed: {str(e2)}")
    
    return stats

def _to_dataframe(req: ScoreRequest) -> pd.DataFrame:
    row = {
        "loan_amnt": req.loan_amnt,
        "annual_inc": req.annual_inc,
        "dti": req.dti,
        "emp_length": req.emp_length,
        "grade": req.grade,
        "term": req.term,
        "purpose": req.purpose,
        "home_ownership": req.home_ownership,
        "state": req.state,
        "revol_util": req.revol_util,
        "fico": req.fico,
    }
    df = pd.DataFrame([row])
    
    # Add engineered features (matching training script)
    # Existing features
    df["loan_to_income"] = df["loan_amnt"] / (df["annual_inc"] + 1)
    df["fico_dti_interaction"] = df["fico"] * (1 / (df["dti"] + 1))
    df["revol_util_squared"] = df["revol_util"] ** 2
    df["annual_inc_log"] = np.log1p(df["annual_inc"])
    
    # Risk bucket features: Categorize continuous variables into risk buckets
    df["dti_bucket"] = pd.cut(df["dti"], bins=[-np.inf, 15, 25, np.inf], labels=[0, 1, 2]).astype(float)
    df["fico_bucket"] = pd.cut(df["fico"], bins=[-np.inf, 650, 700, 750, np.inf], labels=[0, 1, 2, 3]).astype(float)
    df["lti_bucket"] = pd.cut(df["loan_to_income"], bins=[-np.inf, 0.2, 0.4, np.inf], labels=[0, 1, 2]).astype(float)
    df["emp_stability"] = pd.cut(df["emp_length"], bins=[-np.inf, 2, 5, np.inf], labels=[0, 1, 2]).astype(float)
    
    # Interaction features: Capture relationships between multiple variables
    grade_map = {"A": 1, "B": 2, "C": 3, "D": 4, "E": 5, "F": 6, "G": 7}
    df["grade_numeric"] = df["grade"].map(grade_map).fillna(0)
    df["fico_grade_interaction"] = df["fico"] * df["grade_numeric"]
    df["dti_revol_interaction"] = df["dti"] * (df["revol_util"] / 100)
    df["term_numeric"] = df["term"].str.extract(r"(\d+)").astype(float).fillna(36)
    df["income_term_interaction"] = df["annual_inc"] / (df["term_numeric"] + 1)
    purpose_risk_weights = {
        "small_business": 1.5, "other": 1.3, "debt_consolidation": 1.2,
        "credit_card": 1.1, "home_improvement": 1.0, "major_purchase": 0.9,
        "car": 0.8, "medical": 0.8, "house": 0.7, "vacation": 0.7, "wedding": 0.6,
        "moving": 0.6, "educational": 0.5
    }
    df["purpose_risk_weight"] = df["purpose"].map(purpose_risk_weights).fillna(1.0)
    df["loan_purpose_risk"] = df["loan_amnt"] * df["purpose_risk_weight"]
    
    # Polynomial features: Capture non-linear relationships
    df["fico_squared"] = df["fico"] ** 2
    df["dti_squared"] = df["dti"] ** 2
    df["loan_amnt_squared"] = df["loan_amnt"] ** 2
    
    # Ratio and normalized features: Derived metrics for better interpretability
    df["income_per_year_employed"] = df["annual_inc"] / (df["emp_length"] + 1)
    monthly_payment = df["loan_amnt"] / df["term_numeric"]
    df["debt_service_ratio"] = monthly_payment / (df["annual_inc"] / 12 + 1)
    df["credit_utilization_ratio"] = df["revol_util"] / 100
    
    # Drop intermediate helper columns
    intermediate_cols = ["grade_numeric", "term_numeric", "purpose_risk_weight"]
    df = df.drop(columns=[col for col in intermediate_cols if col in df.columns])
    
    if feature_order:
        missing = [c for c in feature_order if c not in df.columns]
        if missing:
            logger.error(f"Missing required features: {missing}")
            raise HTTPException(
                status_code=400, 
                detail="Invalid request: missing required fields. Please check your input and try again."
            )
        df = df[feature_order]
    return df

@app.get("/health")
def health():
    return {
        "status": "ok", 
        "model_loaded": _loaded, 
        "supabase_connected": SUPABASE_URL is not None and SUPABASE_KEY is not None,
        "allowed_origins": ALLOWED_ORIGINS
    }

@app.post("/score", response_model=ScoreResponse, dependencies=[Depends(require_key)])
@limiter.limit(SCORE_RATE_LIMIT)
def score(request: Request, req: ScoreRequest, authorization: str | None = Header(default=None)):
    if model is None:
        logger.error("Scoring endpoint called but model is not loaded")
        raise HTTPException(
            status_code=503, 
            detail="Scoring service is temporarily unavailable. Please try again later."
        )
    
    # Extract user JWT from Authorization header
    user_jwt = None
    user_id = None
    is_valid_token = False
    
    if authorization and authorization.startswith("Bearer "):
        user_jwt = authorization.split(" ")[1]
        # Extract user_id early for cache invalidation
        user_id, is_valid_token = get_user_id_from_token(authorization)
    
    df = _to_dataframe(req)
    try:
        # Use calibrated model if available, otherwise fall back to base model
        if calibrated_model is not None:
            # Transform data using pipeline preprocessing
            # ColumnTransformer expects: all numerical features first, then all categorical
            # Reorder DataFrame to match ColumnTransformer's expected input order
            preprocessor = model.named_steps['pre']
            num_cols = [
                # Original features
                "loan_amnt", "annual_inc", "dti", "emp_length", "revol_util", "fico",
                # Existing engineered features
                "loan_to_income", "fico_dti_interaction", "revol_util_squared", "annual_inc_log",
                # Risk bucket features
                "dti_bucket", "fico_bucket", "lti_bucket", "emp_stability",
                # Interaction features
                "fico_grade_interaction", "dti_revol_interaction", "income_term_interaction", "loan_purpose_risk",
                # Polynomial features
                "fico_squared", "dti_squared", "loan_amnt_squared",
                # Ratio and normalized features
                "income_per_year_employed", "debt_service_ratio", "credit_utilization_ratio"
            ]
            cat_cols = ["grade", "term", "purpose", "home_ownership", "state"]
            expected_order = num_cols + cat_cols
            df_ordered = df[expected_order]
            
            X_transformed = preprocessor.transform(df_ordered)
            # Get calibrated prediction
            pd_hat = float(calibrated_model.predict_proba(X_transformed)[0, 1])
        else:
            # Fall back to base model
            pd_hat = float(model.predict_proba(df)[:, 1][0])
    except Exception as e:
        logger.error(f"ML model inference failed: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="An error occurred while processing your request. Please verify your input and try again."
        )
    risk = _risk_grade(pd_hat)
    decision = "approve" if pd_hat < THRESHOLD else "review"
    
    # Compute SHAP explanation
    explanation_data = _compute_shap_explanation(df, pd_hat)
    explanation = None
    if explanation_data:
        from schemas import Explanation, FeatureContribution
        try:
            feature_contribs = [
                FeatureContribution(**feat) for feat in explanation_data["top_features"]
            ]
            explanation = Explanation(
                top_features=feature_contribs,
                summary=explanation_data["summary"]
            )
        except Exception as e:
            logger.warning(f"Failed to create explanation object: {str(e)}")
            explanation = None
    
    # Save to Supabase if connected
    supabase = get_supabase_client(user_jwt)
    if supabase:
        application_data = {
            "loan_amnt": req.loan_amnt,
            "annual_inc": float(req.annual_inc),
            "dti": float(req.dti),
            "emp_length": req.emp_length,
            "grade": req.grade,
            "term": req.term,
            "purpose": req.purpose,
            "home_ownership": req.home_ownership,
            "state": req.state,
            "revol_util": float(req.revol_util),
            "fico": req.fico,
            "pd": float(pd_hat),
            "risk_grade": risk,
            "decision": decision
        }
        
        # Only include explanation if it exists (not None)
        if explanation_data is not None:
            application_data["explanation"] = explanation_data  # Store explanation as JSONB
        
        # Add user_id if JWT is available and valid
        if is_valid_token and user_id:
            application_data["user_id"] = user_id
        elif user_jwt and not is_valid_token:
            logger.warning("Invalid or unverifiable JWT token provided for application scoring")
        
        # Attempt to save with retry logic for transient errors
        max_retries = 2
        saved_successfully = False
        
        for attempt in range(max_retries + 1):
            try:
                result = supabase.table("applications").insert(application_data).execute()
                
                # Verify insert was successful
                if hasattr(result, 'data') and result.data:
                    saved_successfully = True
                    if attempt > 0:
                        logger.info(f"Successfully saved application after {attempt} retries")
                    
                    # Portfolio stats are automatically updated via database trigger
                    # (trigger_update_portfolio_stats_on_insert) when application is inserted.
                    # No manual cache invalidation needed - stats are kept fresh automatically.
                    if is_valid_token and user_id:
                        logger.debug(f"Application saved for user {user_id}; portfolio stats will be updated automatically by trigger")
                    
                    break
                elif hasattr(result, 'data') and not result.data:
                    # Insert returned no data - could be RLS policy issue
                    logger.warning(
                        f"Database insert returned no data (attempt {attempt + 1}/{max_retries + 1}). "
                        "This may indicate RLS policy rejection or missing user_id."
                    )
                    if attempt == max_retries:
                        raise ValueError("Insert operation returned no data after retries")
                    continue
                else:
                    # Unexpected result structure
                    logger.warning(
                        f"Unexpected result structure from insert (attempt {attempt + 1}/{max_retries + 1}): "
                        f"{type(result)}"
                    )
                    if attempt == max_retries:
                        raise ValueError("Insert operation returned unexpected result structure")
                    continue
                    
            except Exception as e:
                error_type = type(e).__name__
                error_msg = str(e)
                
                # Determine if this is a transient error (worth retrying)
                is_transient = any(indicator in error_msg.lower() for indicator in [
                    'timeout', 'connection', 'network', 'temporary', '503', '502', '504'
                ])
                
                if attempt < max_retries and is_transient:
                    logger.warning(
                        f"Transient error during database insert (attempt {attempt + 1}/{max_retries + 1}): "
                        f"{error_type}: {error_msg}. Retrying..."
                    )
                    continue
                else:
                    # Log the failure (critical or max retries reached)
                    logger.error(
                        f"Failed to save application to database after {attempt + 1} attempts: "
                        f"{error_type}: {error_msg}. "
                        f"Scoring completed successfully but data was not persisted.",
                        exc_info=True
                    )
                    break
        
        if not saved_successfully:
            logger.error(
                "Application scoring completed but data persistence failed. "
                "This may indicate database connectivity issues or RLS policy violations."
            )
    
    return ScoreResponse(pd=pd_hat, risk_grade=risk, decision=decision, top_features=None, explanation=explanation)

@app.get("/portfolio", dependencies=[Depends(require_key)])
@limiter.limit(PORTFOLIO_RATE_LIMIT)
def portfolio(request: Request, authorization: str | None = Header(default=None)):
    # Extract user JWT from Authorization header
    user_jwt = None
    if authorization and authorization.startswith("Bearer "):
        user_jwt = authorization.split(" ")[1]
    
    supabase = get_supabase_client(user_jwt)
    if not supabase:
        return {"error": "Supabase not connected"}
    
    # Extract user ID from Supabase JWT token
    user_id, is_valid_token = get_user_id_from_token(authorization)
    
    # Log warning if token was provided but invalid (RLS will handle security)
    if authorization and not is_valid_token:
        logger.warning("Invalid or unverifiable JWT token provided for portfolio query. RLS policies will enforce access control.")
    
    try:
        # Get portfolio stats from cache or compute fresh (uses row count comparison)
        stats = _get_or_compute_portfolio_stats(supabase, user_id if is_valid_token and user_id else None)
        
        # Get all applications (always fetch fresh, not cached)
        # Remove limit to fetch all applications for pagination
        recent_query = supabase.table("applications").select(
            "id, created_at, loan_amnt, annual_inc, pd, risk_grade, decision, explanation"
        ).order("created_at", desc=True)
        
        if is_valid_token and user_id:
            recent_query = recent_query.eq("user_id", user_id)
        
        recent_result = recent_query.execute()
        
        return {
            "total_applications": stats["total_applications"],
            "avg_pd": stats["avg_pd"],
            "approval_rate": stats["approval_rate"],
            "default_rate": stats["default_rate"],
            "grade_distribution": stats["grade_distribution"],
            "recent_applications": recent_result.data
        }
        
    except Exception as e:
        logger.error(f"Failed to retrieve portfolio data: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="An error occurred while retrieving portfolio data. Please try again later."
        )

@app.get("/portfolio/simulate", dependencies=[Depends(require_key)])
@limiter.limit(PORTFOLIO_RATE_LIMIT)
def simulate_portfolio(request: Request, threshold: float = Query(0.15, ge=0.01, le=0.25), authorization: str | None = Header(default=None)):
    # Extract user JWT from Authorization header
    user_jwt = None
    if authorization and authorization.startswith("Bearer "):
        user_jwt = authorization.split(" ")[1]
    
    supabase = get_supabase_client(user_jwt)
    if not supabase:
        return {"error": "Supabase not connected"}
    
    # Extract user ID from Supabase JWT token
    user_id, is_valid_token = get_user_id_from_token(authorization)
    
    # Log warning if token was provided but invalid (RLS will handle security)
    if authorization and not is_valid_token:
        logger.warning("Invalid or unverifiable JWT token provided for portfolio simulation. RLS policies will enforce access control.")
    
    try:
        # Get all applications with optional user filtering
        # Note: RLS policies in Supabase will enforce data isolation even if user_id is None
        query = supabase.table("applications").select("pd, risk_grade")
        if is_valid_token and user_id:
            query = query.eq("user_id", user_id)
        
        result = query.execute()
        applications = result.data
        
        if not applications:
            return {
                "threshold": threshold,
                "approval_rate": 0.0,
                "expected_default_rate": 0.0,
                "applications_approved": 0,
                "applications_rejected": 0
            }
        
        # Simulate with new threshold
        approved_apps = [app for app in applications if app["pd"] < threshold]
        rejected_apps = [app for app in applications if app["pd"] >= threshold]
        
        approval_rate = len(approved_apps) / len(applications)
        expected_default_rate = sum(app["pd"] for app in approved_apps) / len(approved_apps) if approved_apps else 0.0
        
        return {
            "threshold": threshold,
            "approval_rate": round(approval_rate, 4),
            "expected_default_rate": round(expected_default_rate, 4),
            "applications_approved": len(approved_apps),
            "applications_rejected": len(rejected_apps)
        }
        
    except Exception as e:
        logger.error(f"Portfolio simulation failed: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="An error occurred while running the simulation. Please try again later."
        )

@app.get("/applications/{application_id}", dependencies=[Depends(require_key)])
@limiter.limit(PORTFOLIO_RATE_LIMIT)
def get_application(request: Request, application_id: str, authorization: str | None = Header(default=None)):
    """
    Get a single application by ID with full details including explanation.
    Requires authentication and verifies user owns the application.
    """
    # Extract and verify user JWT
    user_jwt = None
    user_id = None
    is_valid_token = False
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authentication required to view applications."
        )
    
    user_jwt = authorization.split(" ")[1]
    user_id, is_valid_token = get_user_id_from_token(authorization)
    
    if not is_valid_token or not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token."
        )
    
    # Get Supabase client
    supabase = get_supabase_client(user_jwt)
    if not supabase:
        raise HTTPException(
            status_code=503,
            detail="Database service is temporarily unavailable."
        )
    
    try:
        # Fetch application with RLS enforcement (user can only see their own)
        result = supabase.table("applications").select("*").eq("id", application_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=404,
                detail="Application not found or you don't have permission to view it."
            )
        
        application = result.data[0]
        return application
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve application: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while retrieving the application."
        )

@app.delete("/applications/{application_id}", dependencies=[Depends(require_key)])
@limiter.limit(PORTFOLIO_RATE_LIMIT)
def delete_application(request: Request, application_id: str, authorization: str | None = Header(default=None)):
    """
    Delete an application by ID.
    Requires authentication and verifies user ownership via RLS.
    """
    # Extract and verify user JWT
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please sign in to delete applications."
        )
    
    user_jwt = authorization.split(" ")[1]
    user_id, is_valid_token = get_user_id_from_token(authorization)
    
    if not is_valid_token or not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token. Please sign in again."
        )
    
    # Get Supabase client with user context
    supabase = get_supabase_client(user_jwt)
    if not supabase:
        logger.error("Supabase client creation failed for application deletion")
        raise HTTPException(
            status_code=503,
            detail="Database service is temporarily unavailable. Please try again later."
        )
    
    try:
        # Delete application (RLS will ensure user can only delete their own applications)
        result = supabase.table("applications").delete().eq("id", application_id).execute()
        
        # Check if deletion was successful
        if result.data and len(result.data) > 0:
            logger.info(f"Application {application_id} deleted by user {user_id}")
            # Portfolio stats are automatically updated via database trigger
            # (trigger_update_portfolio_stats_on_delete) when application is deleted.
            return {"success": True, "message": "Application deleted successfully"}
        else:
            # No rows deleted - application doesn't exist or user doesn't have permission
            raise HTTPException(
                status_code=404,
                detail="Application not found or you don't have permission to delete it"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting application {application_id}: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while deleting the application. Please try again later."
        )

@app.post("/applications/save", response_model=SaveApplicationResponse, dependencies=[Depends(require_key)])
@limiter.limit(SCORE_RATE_LIMIT)
def save_application(request: Request, req: SaveApplicationRequest, authorization: str | None = Header(default=None)):
    """
    Save a previously scored application to the database.
    Requires authentication. This endpoint is used to persist applications
    that were scored while the user was unauthenticated.
    """
    # Extract and verify user JWT
    user_jwt = None
    user_id = None
    is_valid_token = False
    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please sign in to save applications."
        )
    
    user_jwt = authorization.split(" ")[1]
    user_id, is_valid_token = get_user_id_from_token(authorization)
    
    if not is_valid_token or not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token. Please sign in again."
        )
    
    # Get Supabase client with user context
    supabase = get_supabase_client(user_jwt)
    if not supabase:
        logger.error("Supabase client creation failed for application save")
        raise HTTPException(
            status_code=503,
            detail="Database service is temporarily unavailable. Please try again later."
        )
    
    # Prepare application data for insertion
    application_data = {
        "user_id": user_id,  # Always set user_id for this endpoint
        "loan_amnt": req.loan_amnt,
        "annual_inc": float(req.annual_inc),
        "dti": float(req.dti),
        "emp_length": req.emp_length,
        "grade": req.grade,
        "term": req.term,
        "purpose": req.purpose,
        "home_ownership": req.home_ownership,
        "state": req.state,
        "revol_util": float(req.revol_util),
        "fico": req.fico,
        "pd": float(req.pd),
        "risk_grade": req.risk_grade,
        "decision": req.decision
    }
    
    # Include explanation if provided
    if req.explanation is not None:
        application_data["explanation"] = req.explanation
    
    # Attempt to save with retry logic
    max_retries = 2
    saved_successfully = False
    application_id = None
    
    for attempt in range(max_retries + 1):
        try:
            result = supabase.table("applications").insert(application_data).execute()
            
            # Verify insert was successful
            if hasattr(result, 'data') and result.data and len(result.data) > 0:
                saved_successfully = True
                application_id = result.data[0].get("id")
                
                if attempt > 0:
                    logger.info(f"Successfully saved application after {attempt} retries")
                
                # Portfolio stats are automatically updated via database trigger
                logger.debug(f"Application saved for user {user_id}; portfolio stats will be updated automatically by trigger")
                break
            elif hasattr(result, 'data') and (not result.data or len(result.data) == 0):
                # Insert returned no data - could be RLS policy issue
                logger.warning(
                    f"Database insert returned no data (attempt {attempt + 1}/{max_retries + 1}). "
                    "This may indicate RLS policy rejection."
                )
                if attempt == max_retries:
                    raise ValueError("Insert operation returned no data after retries")
                continue
            else:
                # Unexpected result structure
                logger.warning(
                    f"Unexpected result structure from insert (attempt {attempt + 1}/{max_retries + 1}): "
                    f"{type(result)}"
                )
                if attempt == max_retries:
                    raise ValueError("Insert operation returned unexpected result structure")
                continue
                
        except Exception as e:
            error_type = type(e).__name__
            error_msg = str(e)
            
            # Determine if this is a transient error (worth retrying)
            is_transient = any(indicator in error_msg.lower() for indicator in [
                'timeout', 'connection', 'network', 'temporary', '503', '502', '504'
            ])
            
            if attempt < max_retries and is_transient:
                logger.warning(
                    f"Transient error during database insert (attempt {attempt + 1}/{max_retries + 1}): "
                    f"{error_type}: {error_msg}. Retrying..."
                )
                continue
            else:
                # Log the failure (critical or max retries reached)
                logger.error(
                    f"Failed to save application to database after {attempt + 1} attempts: "
                    f"{error_type}: {error_msg}.",
                    exc_info=True
                )
                break
    
    if not saved_successfully:
        logger.error(f"Failed to save application for user {user_id}")
        raise HTTPException(
            status_code=500,
            detail="Failed to save application. Please try again or score the application again."
        )
    
    return SaveApplicationResponse(
        success=True,
        message="Application saved successfully",
        application_id=application_id
    )
