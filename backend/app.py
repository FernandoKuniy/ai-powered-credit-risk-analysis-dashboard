# backend/app.py
import os, json, joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Depends, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from schemas import ScoreRequest, ScoreResponse
from supabase import create_client, Client
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables from .env.local file
load_dotenv("../.env.local")

app = FastAPI()

# --- CORS: allow local dev + configurable prod origins ---
DEFAULT_ORIGINS = ["http://localhost:3000"]
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", ",".join(DEFAULT_ORIGINS)).split(",")
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
supabase: Client | None = None

if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

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
            raise HTTPException(status_code=400, detail=f"Missing features: {missing}")
        df = df[feature_order]
    return df

@app.get("/health")
def health():
    return {
        "status": "ok", 
        "model_loaded": _loaded, 
        "supabase_connected": supabase is not None,
        "allowed_origins": ALLOWED_ORIGINS
    }

@app.post("/score", response_model=ScoreResponse, dependencies=[Depends(require_key)])
def score(req: ScoreRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Train or add backend/models/model.pkl.")
    df = _to_dataframe(req)
    try:
        pd_hat = float(model.predict_proba(df)[:, 1][0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {e}")
    risk = _risk_grade(pd_hat)
    decision = "approve" if pd_hat < THRESHOLD else "review"
    
    # Save to Supabase if connected
    if supabase:
        try:
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
            supabase.table("applications").insert(application_data).execute()
        except Exception as e:
            print(f"Warning: Failed to save to Supabase: {e}")
    
    return ScoreResponse(pd=pd_hat, risk_grade=risk, decision=decision, top_features=None)

@app.get("/portfolio", dependencies=[Depends(require_key)])
def portfolio():
    if not supabase:
        return {"error": "Supabase not connected"}
    
    try:
        # Get total applications
        total_result = supabase.table("applications").select("id", count="exact").execute()
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
        
        # Get aggregated stats
        stats_result = supabase.table("applications").select("pd, risk_grade, decision").execute()
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
        
        # Recent applications (last 20)
        recent_result = supabase.table("applications").select(
            "created_at, loan_amnt, annual_inc, pd, risk_grade, decision"
        ).order("created_at", desc=True).limit(20).execute()
        
        return {
            "total_applications": total_applications,
            "avg_pd": round(avg_pd, 4),
            "approval_rate": round(approval_rate, 4),
            "default_rate": round(avg_pd, 4),  # Using avg PD as proxy for expected default rate
            "grade_distribution": grade_counts,
            "recent_applications": recent_result.data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

@app.get("/portfolio/simulate", dependencies=[Depends(require_key)])
def simulate_portfolio(threshold: float = Query(0.25, ge=0.05, le=0.50)):
    if not supabase:
        return {"error": "Supabase not connected"}
    
    try:
        # Get all applications
        result = supabase.table("applications").select("pd, risk_grade").execute()
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
        raise HTTPException(status_code=500, detail=f"Simulation error: {e}")
