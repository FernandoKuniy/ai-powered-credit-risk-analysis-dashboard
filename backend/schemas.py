from pydantic import BaseModel, confloat, conint, field_validator
from typing import Literal

class ScoreRequest(BaseModel):
    loan_amnt: conint(gt=0)
    annual_inc: confloat(gt=0)
    dti: confloat(ge=0)
    emp_length: conint(ge=0, le=40)
    grade: Literal["A", "B", "C", "D", "E", "F", "G"]
    term: Literal["36 months", "60 months"]
    purpose: Literal[
        "car",
        "credit_card",
        "debt_consolidation",
        "home_improvement",
        "house",
        "major_purchase",
        "medical",
        "moving",
        "other",
        "renewable_energy",
        "small_business",
        "vacation"
    ]
    home_ownership: Literal["RENT", "MORTGAGE", "OWN", "OTHER"]
    state: str
    revol_util: confloat(ge=0, le=150)
    fico: conint(ge=300, le=900)
    
    @field_validator("state")
    @classmethod
    def validate_state(cls, v: str) -> str:
        """Validate US state code is 2 uppercase letters"""
        if not isinstance(v, str):
            raise ValueError("State must be a string")
        v = v.strip().upper()
        if len(v) != 2 or not v.isalpha():
            raise ValueError("State must be a 2-letter US state code (e.g., 'MA', 'CA')")
        return v

class ScoreResponse(BaseModel):
    pd: float
    risk_grade: str
    decision: str
    top_features: list[str] | None = None

class SaveApplicationRequest(BaseModel):
    """Request model for saving a previously scored application"""
    # Input features
    loan_amnt: conint(gt=0)
    annual_inc: confloat(gt=0)
    dti: confloat(ge=0)
    emp_length: conint(ge=0, le=40)
    grade: Literal["A", "B", "C", "D", "E", "F", "G"]
    term: Literal["36 months", "60 months"]
    purpose: Literal[
        "car",
        "credit_card",
        "debt_consolidation",
        "home_improvement",
        "house",
        "major_purchase",
        "medical",
        "moving",
        "other",
        "renewable_energy",
        "small_business",
        "vacation"
    ]
    home_ownership: Literal["RENT", "MORTGAGE", "OWN", "OTHER"]
    state: str
    revol_util: confloat(ge=0, le=150)
    fico: conint(ge=300, le=900)
    # Results (already computed)
    pd: confloat(ge=0.0, le=1.0)
    risk_grade: Literal["A", "B", "C", "D", "E", "F", "G"]
    decision: Literal["approve", "review"]
    
    @field_validator("state")
    @classmethod
    def validate_state(cls, v: str) -> str:
        """Validate US state code is 2 uppercase letters"""
        if not isinstance(v, str):
            raise ValueError("State must be a string")
        v = v.strip().upper()
        if len(v) != 2 or not v.isalpha():
            raise ValueError("State must be a 2-letter US state code (e.g., 'MA', 'CA')")
        return v

class SaveApplicationResponse(BaseModel):
    success: bool
    message: str
    application_id: str | None = None
