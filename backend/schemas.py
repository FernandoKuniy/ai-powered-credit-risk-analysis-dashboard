from pydantic import BaseModel, confloat, conint

class ScoreRequest(BaseModel):
    loan_amnt: conint(gt=0)
    annual_inc: confloat(gt=0)
    dti: confloat(ge=0)
    emp_length: conint(ge=0, le=40)
    grade: str
    term: str
    purpose: str
    home_ownership: str
    state: str
    revol_util: confloat(ge=0, le=150)
    fico: conint(ge=300, le=900)

class ScoreResponse(BaseModel):
    pd: float
    risk_grade: str
    decision: str
    top_features: list[str] | None = None
