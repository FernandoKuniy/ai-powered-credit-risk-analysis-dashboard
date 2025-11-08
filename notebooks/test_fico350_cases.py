"""
Test the retrained model on problematic FICO 350 cases
"""
import pandas as pd
import numpy as np
import joblib
import json
import sys
import os

# Add backend to path
sys.path.append('backend')

# Load model artifacts
print("Loading model...")
model = joblib.load("backend/models/model.pkl")
calibrated_model = joblib.load("backend/models/model_calibrated.pkl")

with open("backend/models/feature_meta.json", "r") as f:
    feature_meta = json.load(f)

feature_order = feature_meta["feature_order"]
print(f"Model loaded. Features: {len(feature_order)}")

# Load problematic applications
df = pd.read_csv("/Users/fernandokuniy/Downloads/applications_rows (2).csv")

print("\n" + "=" * 60)
print("Testing FICO 350 Cases with Retrained Model")
print("=" * 60)

def create_features(row):
    """Create feature engineering matching training script"""
    df_input = pd.DataFrame([{
        'loan_amnt': float(row['loan_amnt']),
        'annual_inc': float(row['annual_inc']),
        'dti': float(row['dti']),
        'emp_length': float(row['emp_length']),
        'grade': row['grade'],
        'term': row['term'],
        'purpose': row['purpose'],
        'home_ownership': row['home_ownership'],
        'state': row['state'],
        'revol_util': float(row['revol_util']),
        'fico': float(row['fico'])
    }])
    
    # Convert emp_length to numeric
    df_input["emp_length"] = (
        df_input["emp_length"]
        .astype(str)
        .str.extract(r"(\d+)")
        .fillna(0)
        .astype(float)
    )
    
    # Feature engineering (matching train_credit_model.py)
    df_input["loan_to_income"] = df_input["loan_amnt"] / (df_input["annual_inc"] + 1)
    df_input["fico_dti_interaction"] = df_input["fico"] * (1 / (df_input["dti"] + 1))
    df_input["revol_util_squared"] = df_input["revol_util"] ** 2
    df_input["annual_inc_log"] = np.log1p(df_input["annual_inc"])
    
    # Risk bucket features
    df_input["dti_bucket"] = pd.cut(df_input["dti"], bins=[-np.inf, 15, 25, np.inf], labels=[0, 1, 2]).astype(float)
    df_input["fico_bucket"] = pd.cut(df_input["fico"], bins=[-np.inf, 650, 700, 750, np.inf], labels=[0, 1, 2, 3]).astype(float)
    df_input["lti_bucket"] = pd.cut(df_input["loan_to_income"], bins=[-np.inf, 0.2, 0.4, np.inf], labels=[0, 1, 2]).astype(float)
    df_input["emp_stability"] = pd.cut(df_input["emp_length"], bins=[-np.inf, 2, 5, np.inf], labels=[0, 1, 2]).astype(float)
    
    # Interaction features
    grade_map = {"A": 1, "B": 2, "C": 3, "D": 4, "E": 5, "F": 6, "G": 7}
    df_input["grade_numeric"] = df_input["grade"].map(grade_map).fillna(0)
    df_input["fico_grade_interaction"] = df_input["fico"] * df_input["grade_numeric"]
    df_input["dti_revol_interaction"] = df_input["dti"] * (df_input["revol_util"] / 100)
    df_input["term_numeric"] = df_input["term"].str.extract(r"(\d+)").astype(float).fillna(36)
    df_input["income_term_interaction"] = df_input["annual_inc"] / (df_input["term_numeric"] + 1)
    purpose_risk_weights = {
        "small_business": 1.5, "other": 1.3, "debt_consolidation": 1.2,
        "credit_card": 1.1, "home_improvement": 1.0, "major_purchase": 0.9,
        "car": 0.8, "medical": 0.8, "house": 0.7, "vacation": 0.7, "wedding": 0.6,
        "moving": 0.6, "educational": 0.5
    }
    df_input["purpose_risk_weight"] = df_input["purpose"].map(purpose_risk_weights).fillna(1.0)
    df_input["loan_purpose_risk"] = df_input["loan_amnt"] * df_input["purpose_risk_weight"]
    
    # Polynomial features
    df_input["fico_squared"] = df_input["fico"] ** 2
    df_input["dti_squared"] = df_input["dti"] ** 2
    df_input["loan_amnt_squared"] = df_input["loan_amnt"] ** 2
    
    # Ratio and normalized features
    df_input["income_per_year_employed"] = df_input["annual_inc"] / (df_input["emp_length"] + 1)
    monthly_payment = df_input["loan_amnt"] / df_input["term_numeric"]
    df_input["debt_service_ratio"] = monthly_payment / (df_input["annual_inc"] / 12 + 1)
    df_input["credit_utilization_ratio"] = df_input["revol_util"] / 100
    
    # Drop intermediate columns
    intermediate_cols = ["grade_numeric", "term_numeric", "purpose_risk_weight"]
    df_input = df_input.drop(columns=[col for col in intermediate_cols if col in df_input.columns])
    
    return df_input[feature_order]

def get_risk_grade(pd_value):
    """Convert PD to risk grade"""
    if pd_value < 0.10:
        return 'A'
    elif pd_value < 0.15:
        return 'B'
    elif pd_value < 0.25:
        return 'C'
    elif pd_value < 0.35:
        return 'D'
    elif pd_value < 0.45:
        return 'E'
    elif pd_value < 0.55:
        return 'F'
    else:
        return 'G'

results = []
for idx, row in df.iterrows():
    print(f"\n[Case {idx + 1}]")
    print(f"  FICO: {row['fico']}")
    print(f"  DTI: {row['dti']}%")
    print(f"  Grade: {row['grade']}")
    print(f"  Loan: ${row['loan_amnt']:,.0f}")
    print(f"  Income: ${row['annual_inc']:,.0f}")
    
    # Create features with engineering (matching backend/app.py)
    df_input = pd.DataFrame([{
        'loan_amnt': float(row['loan_amnt']),
        'annual_inc': float(row['annual_inc']),
        'dti': float(row['dti']),
        'emp_length': float(row['emp_length']),
        'grade': row['grade'],
        'term': row['term'],
        'purpose': row['purpose'],
        'home_ownership': row['home_ownership'],
        'state': row['state'],
        'revol_util': float(row['revol_util']),
        'fico': float(row['fico'])
    }])
    
    # Convert emp_length to numeric
    df_input["emp_length"] = (
        df_input["emp_length"]
        .astype(str)
        .str.extract(r"(\d+)")
        .fillna(0)
        .astype(float)
    )
    
    # Feature engineering (matching backend/app.py exactly)
    df_input["loan_to_income"] = df_input["loan_amnt"] / (df_input["annual_inc"] + 1)
    df_input["fico_dti_interaction"] = df_input["fico"] * (1 / (df_input["dti"] + 1))
    df_input["revol_util_squared"] = df_input["revol_util"] ** 2
    df_input["annual_inc_log"] = np.log1p(df_input["annual_inc"])
    
    df_input["dti_bucket"] = pd.cut(df_input["dti"], bins=[-np.inf, 15, 25, np.inf], labels=[0, 1, 2]).astype(float)
    df_input["fico_bucket"] = pd.cut(df_input["fico"], bins=[-np.inf, 650, 700, 750, np.inf], labels=[0, 1, 2, 3]).astype(float)
    df_input["lti_bucket"] = pd.cut(df_input["loan_to_income"], bins=[-np.inf, 0.2, 0.4, np.inf], labels=[0, 1, 2]).astype(float)
    df_input["emp_stability"] = pd.cut(df_input["emp_length"], bins=[-np.inf, 2, 5, np.inf], labels=[0, 1, 2]).astype(float)
    
    grade_map = {"A": 1, "B": 2, "C": 3, "D": 4, "E": 5, "F": 6, "G": 7}
    df_input["grade_numeric"] = df_input["grade"].map(grade_map).fillna(0)
    df_input["fico_grade_interaction"] = df_input["fico"] * df_input["grade_numeric"]
    df_input["dti_revol_interaction"] = df_input["dti"] * (df_input["revol_util"] / 100)
    df_input["term_numeric"] = df_input["term"].str.extract(r"(\d+)").astype(float).fillna(36)
    df_input["income_term_interaction"] = df_input["annual_inc"] / (df_input["term_numeric"] + 1)
    purpose_risk_weights = {
        "small_business": 1.5, "other": 1.3, "debt_consolidation": 1.2,
        "credit_card": 1.1, "home_improvement": 1.0, "major_purchase": 0.9,
        "car": 0.8, "medical": 0.8, "house": 0.7, "vacation": 0.7, "wedding": 0.6,
        "moving": 0.6, "educational": 0.5
    }
    df_input["purpose_risk_weight"] = df_input["purpose"].map(purpose_risk_weights).fillna(1.0)
    df_input["loan_purpose_risk"] = df_input["loan_amnt"] * df_input["purpose_risk_weight"]
    
    df_input["fico_squared"] = df_input["fico"] ** 2
    df_input["dti_squared"] = df_input["dti"] ** 2
    df_input["loan_amnt_squared"] = df_input["loan_amnt"] ** 2
    
    df_input["income_per_year_employed"] = df_input["annual_inc"] / (df_input["emp_length"] + 1)
    monthly_payment = df_input["loan_amnt"] / df_input["term_numeric"]
    df_input["debt_service_ratio"] = monthly_payment / (df_input["annual_inc"] / 12 + 1)
    df_input["credit_utilization_ratio"] = df_input["revol_util"] / 100
    
    # FICO risk penalty: Explicitly penalizes low FICO scores
    df_input["fico_risk_penalty"] = np.maximum(0, (650 - df_input["fico"]) / 100)
    
    intermediate_cols = ["grade_numeric", "term_numeric", "purpose_risk_weight"]
    df_input = df_input.drop(columns=[col for col in intermediate_cols if col in df_input.columns])
    
    # Reorder columns to match what the preprocessor expects
    num_cols = [
        "loan_amnt", "annual_inc", "dti", "emp_length", "revol_util", "fico",
        "loan_to_income", "fico_dti_interaction", "revol_util_squared", "annual_inc_log",
        "dti_bucket", "fico_bucket", "lti_bucket", "emp_stability",
        "fico_grade_interaction", "dti_revol_interaction", "income_term_interaction", "loan_purpose_risk",
        "fico_squared", "dti_squared", "loan_amnt_squared",
        "income_per_year_employed", "debt_service_ratio", "credit_utilization_ratio",
        "fico_risk_penalty"
    ]
    cat_cols = ["grade", "term", "purpose", "home_ownership", "state"]
    expected_order = num_cols + cat_cols
    df_ordered = df_input[expected_order]
    
    # Get preprocessor from pipeline
    preprocessor = model.named_steps['pre']
    
    # Transform data
    X_transformed = preprocessor.transform(df_ordered)
    
    # Get prediction from calibrated model
    pred_proba = calibrated_model.predict_proba(X_transformed)[0][1]
    
    old_pd = row['pd']
    new_pd = pred_proba
    improvement = new_pd - old_pd
    
    old_grade = row['risk_grade']
    new_grade = get_risk_grade(new_pd)
    
    old_decision = row['decision']
    new_decision = "approve" if new_pd < 0.15 else "review"
    
    print(f"  OLD PD: {old_pd:.4f} ({old_pd*100:.2f}%)")
    print(f"  NEW PD: {new_pd:.4f} ({new_pd*100:.2f}%)")
    print(f"  Change: {improvement:+.4f} ({(improvement)*100:+.2f}%)")
    print(f"  OLD Grade: {old_grade} → NEW Grade: {new_grade}")
    print(f"  OLD Decision: {old_decision} → NEW Decision: {new_decision}")
    
    # Check if improvement
    expected_pd_range = (0.40, 0.60)  # Expected for FICO 350
    is_better = new_pd >= expected_pd_range[0] and new_pd <= expected_pd_range[1]
    
    if is_better:
        print(f"  ✅ IMPROVED: PD now in expected range for FICO 350")
    else:
        print(f"  ⚠️  Still outside expected range ({expected_pd_range[0]*100:.0f}%-{expected_pd_range[1]*100:.0f}%)")
    
    results.append({
        'case': idx + 1,
        'fico': row['fico'],
        'old_pd': old_pd,
        'new_pd': new_pd,
        'improvement': improvement,
        'old_grade': old_grade,
        'new_grade': new_grade,
        'is_better': is_better
    })

print("\n" + "=" * 60)
print("Summary")
print("=" * 60)
print(f"Average OLD PD: {np.mean([r['old_pd'] for r in results]):.4f} ({np.mean([r['old_pd'] for r in results])*100:.2f}%)")
print(f"Average NEW PD: {np.mean([r['new_pd'] for r in results]):.4f} ({np.mean([r['new_pd'] for r in results])*100:.2f}%)")
print(f"Average Improvement: {np.mean([r['improvement'] for r in results]):.4f} ({np.mean([r['improvement'] for r in results])*100:+.2f}%)")
print(f"\nCases in expected range (40-60%): {sum([r['is_better'] for r in results])}/{len(results)}")

