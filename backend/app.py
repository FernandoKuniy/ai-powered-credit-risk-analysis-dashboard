from fastapi import FastAPI
from schemas import ScoreRequest, ScoreResponse

app = FastAPI()
THRESHOLD = 0.25

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/score", response_model=ScoreResponse)
def score(req: ScoreRequest):
    pd = 0.18
    risk = "C"
    decision = "approve" if pd < THRESHOLD else "review"
    return ScoreResponse(pd=pd, risk_grade=risk, decision=decision)

@app.get("/portfolio")
def portfolio():
    return {"n": 0, "avg_pd": 0.0, "approval_rate": 0.0}
