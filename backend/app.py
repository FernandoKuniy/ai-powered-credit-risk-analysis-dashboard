from fastapi import FastAPI, HTTPException
from schemas import ScoreRequest, ScoreResponse
import pandas as pd
import json, joblib, os
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
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

def _risk_grade(pd: float) -> str:
    # Simple PD -> grade mapping (tweak as needed)
    if pd < 0.05:  return "A"
    if pd < 0.10:  return "B"
    if pd < 0.20:  return "C"
    if pd < 0.30:  return "D"
    if pd < 0.40:  return "E"
    if pd < 0.60:  return "F"
    return "G"

def _to_dataframe(req: ScoreRequest) -> pd.DataFrame:
    # Build a single-row DataFrame in the same feature order used during training
    row = {
        "loan_amnt": req.loan_amnt,
        "annual_inc": req.annual_inc,
        "dti": req.dti,
        "emp_length": req.emp_length,  # already numeric in API schema
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
        # reindex to match training columns (others will error visibly)
        missing = [c for c in feature_order if c not in df.columns]
        if missing:
            raise HTTPException(status_code=400, detail=f"Missing features: {missing}")
        df = df[feature_order]
    return df

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": _loaded}

@app.post("/score", response_model=ScoreResponse)
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

@app.get("/portfolio")
def portfolio():
    # Stub for now; will read from DB/Supabase later
    return {"n": 0, "avg_pd": 0.0, "approval_rate": 0.0}
