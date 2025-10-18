# backend/app.py
import os, json, joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from schemas import ScoreRequest, ScoreResponse

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

# --- Optional: simple API key guard (set API_KEY in prod; leave empty in dev) ---
API_KEY = os.getenv("API_KEY", "")
def require_key(x_api_key: str | None = Header(default=None)):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

THRESHOLD = 0.25  # approval cutoff on PD

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
    return {"status": "ok", "model_loaded": _loaded, "allowed_origins": ALLOWED_ORIGINS}

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
    return ScoreResponse(pd=pd_hat, risk_grade=risk, decision=decision, top_features=None)

@app.get("/portfolio", dependencies=[Depends(require_key)])
def portfolio():
    return {"n": 0, "avg_pd": 0.0, "approval_rate": 0.0}
