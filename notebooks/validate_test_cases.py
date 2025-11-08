import pandas as pd
import numpy as np
import joblib
import json
from typing import Dict, Tuple

def risk_grade(pd_val: float) -> str:
    """Convert PD to risk grade"""
    if pd_val < 0.05:  return "A"
    elif pd_val < 0.10:  return "B"
    elif pd_val < 0.20:  return "C"
    elif pd_val < 0.30:  return "D"
    elif pd_val < 0.40:  return "E"
    elif pd_val < 0.60:  return "F"
    else: return "G"

# Test cases from TEST_CASES.md
test_cases = [
    {
        "name": "Test Case 1: Excellent Credit Profile",
        "input": {
            "loan_amnt": 15000,
            "annual_inc": 120000.0,
            "dti": 8.5,
            "emp_length": 12,
            "grade": "A",
            "term": "36 months",
            "purpose": "home_improvement",
            "home_ownership": "MORTGAGE",
            "state": "CA",
            "revol_util": 15.0,
            "fico": 780
        },
        "expected": {
            "pd_range": (0.03, 0.07),
            "risk_grade": "A",
            "decision": "approve"
        }
    },
    {
        "name": "Test Case 2: Good Credit Profile",
        "input": {
            "loan_amnt": 25000,
            "annual_inc": 85000.0,
            "dti": 12.0,
            "emp_length": 8,
            "grade": "B",
            "term": "36 months",
            "purpose": "debt_consolidation",
            "home_ownership": "MORTGAGE",
            "state": "TX",
            "revol_util": 25.0,
            "fico": 720
        },
        "expected": {
            "pd_range": (0.09, 0.13),
            "risk_grade": "B",
            "decision": "approve"
        }
    },
    {
        "name": "Test Case 3: Average Credit Profile",
        "input": {
            "loan_amnt": 20000,
            "annual_inc": 65000.0,
            "dti": 18.5,
            "emp_length": 5,
            "grade": "C",
            "term": "60 months",
            "purpose": "credit_card",
            "home_ownership": "RENT",
            "state": "FL",
            "revol_util": 45.0,
            "fico": 680
        },
        "expected": {
            "pd_range": (0.18, 0.25),
            "risk_grade": ["C"],
            "decision": "review"
        }
    },
    {
        "name": "Test Case 4: Moderate Risk Profile",
        "input": {
            "loan_amnt": 30000,
            "annual_inc": 55000.0,
            "dti": 22.0,
            "emp_length": 3,
            "grade": "D",
            "term": "60 months",
            "purpose": "debt_consolidation",
            "home_ownership": "RENT",
            "state": "NY",
            "revol_util": 60.0,
            "fico": 650
        },
        "expected": {
            "pd_range": (0.25, 0.32),
            "risk_grade": ["D"],
            "decision": "review"
        }
    },
    {
        "name": "Test Case 5: Higher Risk Profile",
        "input": {
            "loan_amnt": 35000,
            "annual_inc": 50000.0,
            "dti": 28.0,
            "emp_length": 2,
            "grade": "E",
            "term": "60 months",
            "purpose": "credit_card",
            "home_ownership": "RENT",
            "state": "IL",
            "revol_util": 75.0,
            "fico": 620
        },
        "expected": {
            "pd_range": (0.32, 0.40),
            "risk_grade": ["E"],
            "decision": "review"
        }
    },
    {
        "name": "Test Case 6: Low Income, High Loan Risk",
        "input": {
            "loan_amnt": 40000,
            "annual_inc": 45000.0,
            "dti": 25.0,
            "emp_length": 4,
            "grade": "F",
            "term": "60 months",
            "purpose": "major_purchase",
            "home_ownership": "RENT",
            "state": "GA",
            "revol_util": 55.0,
            "fico": 635
        },
        "expected": {
            "pd_range": (0.40, 0.50),
            "risk_grade": ["F"],
            "decision": "review"
        }
    },
    {
        "name": "Test Case 7: Very Poor Credit Profile",
        "input": {
            "loan_amnt": 15000,
            "annual_inc": 40000.0,
            "dti": 35.0,
            "emp_length": 1,
            "grade": "G",
            "term": "60 months",
            "purpose": "other",
            "home_ownership": "RENT",
            "state": "OH",
            "revol_util": 90.0,
            "fico": 580
        },
        "expected": {
            "pd_range": (0.48, 0.58),
            "risk_grade": ["F", "G"],
            "decision": "review"
        }
    },
    {
        "name": "Test Case 8: Edge Case - High Income, Low Credit",
        "input": {
            "loan_amnt": 20000,
            "annual_inc": 150000.0,
            "dti": 30.0,
            "emp_length": 2,
            "grade": "D",
            "term": "60 months",
            "purpose": "small_business",
            "home_ownership": "MORTGAGE",
            "state": "WA",
            "revol_util": 80.0,
            "fico": 600
        },
        "expected": {
            "pd_range": (0.25, 0.35),
            "risk_grade": ["D", "E"],
            "decision": "review"
        }
    },
    {
        "name": "Test Case 9: Edge Case - Low Loan, Good Profile",
        "input": {
            "loan_amnt": 5000,
            "annual_inc": 75000.0,
            "dti": 10.0,
            "emp_length": 10,
            "grade": "B",
            "term": "36 months",
            "purpose": "car",
            "home_ownership": "OWN",
            "state": "MA",
            "revol_util": 20.0,
            "fico": 750
        },
        "expected": {
            "pd_range": (0.06, 0.10),
            "risk_grade": ["B"],
            "decision": "approve"
        }
    },
    {
        "name": "Test Case 10: Edge Case - Just Below Threshold",
        "input": {
            "loan_amnt": 18000,
            "annual_inc": 60000.0,
            "dti": 16.0,
            "emp_length": 6,
            "grade": "C",
            "term": "36 months",
            "purpose": "medical",
            "home_ownership": "MORTGAGE",
            "state": "NC",
            "revol_util": 35.0,
            "fico": 670
        },
        "expected": {
            "pd_range": (0.16, 0.22),
            "risk_grade": ["C"],
            "decision": "review"
        }
    }
]

print("=" * 80)
print("Test Case Validation")
print("=" * 80)

# Load model
print("\nLoading model...")
model = joblib.load("backend/models/model.pkl")
calibrated_model = joblib.load("backend/models/model_calibrated.pkl")

# Load feature order
with open("backend/models/feature_meta.json") as f:
    feature_meta = json.load(f)
    feature_order = feature_meta["feature_order"]

print(f"Model loaded. Feature order: {feature_order}")

results = []
passed = 0
total = len(test_cases)

print("\n" + "=" * 80)
print("Running Test Cases")
print("=" * 80)

for i, test_case in enumerate(test_cases, 1):
    print(f"\n[{i}/{total}] {test_case['name']}")
    print("-" * 80)
    
    # Convert input to DataFrame
    input_df = pd.DataFrame([test_case['input']])
    
    # Add engineered features (matching training script)
    # Existing features
    input_df["loan_to_income"] = input_df["loan_amnt"] / (input_df["annual_inc"] + 1)
    input_df["fico_dti_interaction"] = input_df["fico"] * (1 / (input_df["dti"] + 1))
    input_df["revol_util_squared"] = input_df["revol_util"] ** 2
    input_df["annual_inc_log"] = np.log1p(input_df["annual_inc"])
    
    # Risk bucket features
    input_df["dti_bucket"] = pd.cut(input_df["dti"], bins=[-np.inf, 15, 25, np.inf], labels=[0, 1, 2]).astype(float)
    input_df["fico_bucket"] = pd.cut(input_df["fico"], bins=[-np.inf, 650, 700, 750, np.inf], labels=[0, 1, 2, 3]).astype(float)
    input_df["lti_bucket"] = pd.cut(input_df["loan_to_income"], bins=[-np.inf, 0.2, 0.4, np.inf], labels=[0, 1, 2]).astype(float)
    input_df["emp_stability"] = pd.cut(input_df["emp_length"], bins=[-np.inf, 2, 5, np.inf], labels=[0, 1, 2]).astype(float)
    
    # Interaction features
    grade_map = {"A": 1, "B": 2, "C": 3, "D": 4, "E": 5, "F": 6, "G": 7}
    input_df["grade_numeric"] = input_df["grade"].map(grade_map).fillna(0)
    input_df["fico_grade_interaction"] = input_df["fico"] * input_df["grade_numeric"]
    input_df["dti_revol_interaction"] = input_df["dti"] * (input_df["revol_util"] / 100)
    input_df["term_numeric"] = input_df["term"].str.extract(r"(\d+)").astype(float).fillna(36)
    input_df["income_term_interaction"] = input_df["annual_inc"] / (input_df["term_numeric"] + 1)
    purpose_risk_weights = {
        "small_business": 1.5, "other": 1.3, "debt_consolidation": 1.2,
        "credit_card": 1.1, "home_improvement": 1.0, "major_purchase": 0.9,
        "car": 0.8, "medical": 0.8, "house": 0.7, "vacation": 0.7, "wedding": 0.6,
        "moving": 0.6, "educational": 0.5
    }
    input_df["purpose_risk_weight"] = input_df["purpose"].map(purpose_risk_weights).fillna(1.0)
    input_df["loan_purpose_risk"] = input_df["loan_amnt"] * input_df["purpose_risk_weight"]
    
    # Polynomial features
    input_df["fico_squared"] = input_df["fico"] ** 2
    input_df["dti_squared"] = input_df["dti"] ** 2
    input_df["loan_amnt_squared"] = input_df["loan_amnt"] ** 2
    
    # Ratio and normalized features
    input_df["income_per_year_employed"] = input_df["annual_inc"] / (input_df["emp_length"] + 1)
    monthly_payment = input_df["loan_amnt"] / input_df["term_numeric"]
    input_df["debt_service_ratio"] = monthly_payment / (input_df["annual_inc"] / 12 + 1)
    input_df["credit_utilization_ratio"] = input_df["revol_util"] / 100
    
    # FICO risk penalty: Explicitly penalizes low FICO scores
    input_df["fico_risk_penalty"] = np.maximum(0, (650 - input_df["fico"]) / 100)
    
    # Drop intermediate helper columns
    intermediate_cols = ["grade_numeric", "term_numeric", "purpose_risk_weight"]
    input_df = input_df.drop(columns=[col for col in intermediate_cols if col in input_df.columns])
    
    # Ensure correct column order
    input_df = input_df[feature_order]
    
    # Transform using pipeline preprocessing
    X_transformed = model.named_steps['pre'].transform(input_df)
    
    # Get predictions from calibrated model
    pd_value = calibrated_model.predict_proba(X_transformed)[0, 1]
    pred_grade = risk_grade(pd_value)
    decision = "approve" if pd_value < 0.15 else "review"
    
    # Check if within expected range
    expected_min, expected_max = test_case['expected']['pd_range']
    in_range = expected_min <= pd_value <= expected_max
    
    # Check risk grade
    expected_grades = test_case['expected']['risk_grade']
    if isinstance(expected_grades, str):
        expected_grades = [expected_grades]
    grade_match = pred_grade in expected_grades
    
    # Check decision
    decision_match = decision == test_case['expected']['decision']
    
    # Overall pass if PD is in range
    case_passed = in_range
    if case_passed:
        passed += 1
    
    status = "✅ PASS" if case_passed else "❌ FAIL"
    
    print(f"  Input: {test_case['input']}")
    print(f"  Predicted PD: {pd_value:.4f} ({pd_value*100:.2f}%)")
    print(f"  Expected PD Range: {expected_min*100:.0f}% - {expected_max*100:.0f}%")
    print(f"  In Range: {'✅' if in_range else '❌'}")
    print(f"  Predicted Risk Grade: {pred_grade}")
    print(f"  Expected Risk Grade: {expected_grades}")
    print(f"  Grade Match: {'✅' if grade_match else '❌'}")
    print(f"  Predicted Decision: {decision}")
    print(f"  Expected Decision: {test_case['expected']['decision']}")
    print(f"  Decision Match: {'✅' if decision_match else '❌'}")
    print(f"  Status: {status}")
    
    results.append({
        "test_case": test_case['name'],
        "predicted_pd": float(pd_value),
        "expected_pd_min": float(expected_min),
        "expected_pd_max": float(expected_max),
        "in_range": bool(in_range),
        "predicted_grade": pred_grade,
        "expected_grades": expected_grades,
        "grade_match": bool(grade_match),
        "predicted_decision": decision,
        "expected_decision": test_case['expected']['decision'],
        "decision_match": bool(decision_match),
        "passed": bool(case_passed)
    })

# Summary
print("\n" + "=" * 80)
print("Summary")
print("=" * 80)
print(f"\nTotal Test Cases: {total}")
print(f"Passed (PD in expected range): {passed}/{total} ({passed/total*100:.1f}%)")

# Detailed breakdown
print("\nDetailed Results:")
print("-" * 80)
for result in results:
    status_icon = "✅" if result['passed'] else "❌"
    print(f"{status_icon} {result['test_case']}")
    print(f"   PD: {result['predicted_pd']*100:.2f}% (expected: {result['expected_pd_min']*100:.0f}%-{result['expected_pd_max']*100:.0f}%)")
    print(f"   Grade: {result['predicted_grade']} (expected: {result['expected_grades']})")
    print(f"   Decision: {result['predicted_decision']} (expected: {result['expected_decision']})")

# Save results
with open("backend/models/test_case_validation_results.json", "w") as f:
    json.dump({
        "summary": {
            "total": total,
            "passed": passed,
            "pass_rate": passed/total
        },
        "results": results
    }, f, indent=2)

print(f"\n✅ Results saved to backend/models/test_case_validation_results.json")

