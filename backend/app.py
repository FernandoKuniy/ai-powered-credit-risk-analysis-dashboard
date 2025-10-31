# backend/app.py
import os, json, joblib
import logging
import pandas as pd
from fastapi import FastAPI, HTTPException, Depends, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from schemas import ScoreRequest, ScoreResponse
from supabase import create_client, Client
from typing import Dict, Any
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

THRESHOLD = 0.25  # approval cutoff on PD

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
META_PATH = "models/feature_meta.json"

model = None
feature_order: list[str] | None = None

def _load_artifacts():
    global model, feature_order
    if not os.path.exists(MODEL_PATH):
        return False
    model = joblib.load(MODEL_PATH)
    with open(META_PATH) as f:
        meta = json.load(f)
    feature_order = meta["feature_order"]
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
    if authorization and authorization.startswith("Bearer "):
        user_jwt = authorization.split(" ")[1]
    
    df = _to_dataframe(req)
    try:
        pd_hat = float(model.predict_proba(df)[:, 1][0])
    except Exception as e:
        logger.error(f"ML model inference failed: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="An error occurred while processing your request. Please verify your input and try again."
        )
    risk = _risk_grade(pd_hat)
    decision = "approve" if pd_hat < THRESHOLD else "review"
    
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
        
        # Add user_id if JWT is available and valid
        if user_jwt:
            user_id, is_valid_token = get_user_id_from_token(authorization)
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
    
    return ScoreResponse(pd=pd_hat, risk_grade=risk, decision=decision, top_features=None)

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
        # Build query with optional user filtering
        # Note: RLS policies in Supabase will enforce data isolation even if user_id is None
        query = supabase.table("applications").select("id", count="exact")
        if is_valid_token and user_id:
            query = query.eq("user_id", user_id)
        
        total_result = query.execute()
        total_applications = total_result.count or 0
        
        if total_applications == 0:
            return {
                "total_applications": 0,
                "avg_pd": 0.0,
                "approval_rate": 0.0,
                "default_rate": 0.0,
                "grade_distribution": {"A": 0, "B": 0, "C": 0, "D": 0, "E": 0, "F": 0, "G": 0},
                "recent_applications": []
            }
        
        # Get aggregated stats with user filtering
        stats_query = supabase.table("applications").select("pd, risk_grade, decision")
        if is_valid_token and user_id:
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
        
        # Recent applications (last 20) with user filtering
        recent_query = supabase.table("applications").select(
            "created_at, loan_amnt, annual_inc, pd, risk_grade, decision"
        ).order("created_at", desc=True).limit(20)
        
        if is_valid_token and user_id:
            recent_query = recent_query.eq("user_id", user_id)
        
        recent_result = recent_query.execute()
        
        return {
            "total_applications": total_applications,
            "avg_pd": round(avg_pd, 4),
            "approval_rate": round(approval_rate, 4),
            "default_rate": round(avg_pd, 4),  # Using avg PD as proxy for expected default rate
            "grade_distribution": grade_counts,
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
def simulate_portfolio(request: Request, threshold: float = Query(0.25, ge=0.05, le=0.50), authorization: str | None = Header(default=None)):
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
