"""
Extended test suite for low FICO cases (300-614)
Tests various combinations of features to assess model performance
"""
import pandas as pd
import numpy as np
import joblib
import json
import sys

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

# Define comprehensive test cases
test_cases = [
    # FICO 350 cases (the problematic ones)
    {
        'name': 'FICO 350 - Grade E - High DTI',
        'fico': 350, 'grade': 'E', 'dti': 50.0, 'loan_amnt': 50000, 'annual_inc': 80000,
        'emp_length': 4, 'term': '36 months', 'purpose': 'debt_consolidation',
        'home_ownership': 'RENT', 'state': 'MA', 'revol_util': 75.0,
        'expected_pd_range': (0.40, 0.60)
    },
    {
        'name': 'FICO 350 - Grade F - High DTI',
        'fico': 350, 'grade': 'F', 'dti': 50.0, 'loan_amnt': 50000, 'annual_inc': 80000,
        'emp_length': 2, 'term': '36 months', 'purpose': 'debt_consolidation',
        'home_ownership': 'RENT', 'state': 'MA', 'revol_util': 75.0,
        'expected_pd_range': (0.50, 0.70)
    },
    {
        'name': 'FICO 350 - Grade G - High DTI',
        'fico': 350, 'grade': 'G', 'dti': 50.0, 'loan_amnt': 50000, 'annual_inc': 80000,
        'emp_length': 1, 'term': '60 months', 'purpose': 'other',
        'home_ownership': 'RENT', 'state': 'MA', 'revol_util': 90.0,
        'expected_pd_range': (0.60, 0.80)
    },
    
    # FICO 350 with different income levels
    {
        'name': 'FICO 350 - Grade E - Low Income',
        'fico': 350, 'grade': 'E', 'dti': 45.0, 'loan_amnt': 30000, 'annual_inc': 40000,
        'emp_length': 3, 'term': '60 months', 'purpose': 'debt_consolidation',
        'home_ownership': 'RENT', 'state': 'CA', 'revol_util': 80.0,
        'expected_pd_range': (0.50, 0.70)
    },
    {
        'name': 'FICO 350 - Grade E - Very Low Income',
        'fico': 350, 'grade': 'E', 'dti': 40.0, 'loan_amnt': 20000, 'annual_inc': 30000,
        'emp_length': 2, 'term': '60 months', 'purpose': 'credit_card',
        'home_ownership': 'RENT', 'state': 'TX', 'revol_util': 85.0,
        'expected_pd_range': (0.55, 0.75)
    },
    
    # Other low FICO ranges
    {
        'name': 'FICO 400 - Grade F - Moderate DTI',
        'fico': 400, 'grade': 'F', 'dti': 35.0, 'loan_amnt': 35000, 'annual_inc': 60000,
        'emp_length': 3, 'term': '60 months', 'purpose': 'debt_consolidation',
        'home_ownership': 'RENT', 'state': 'FL', 'revol_util': 70.0,
        'expected_pd_range': (0.45, 0.65)
    },
    {
        'name': 'FICO 450 - Grade E - High DTI',
        'fico': 450, 'grade': 'E', 'dti': 40.0, 'loan_amnt': 40000, 'annual_inc': 70000,
        'emp_length': 4, 'term': '60 months', 'purpose': 'other',
        'home_ownership': 'RENT', 'state': 'NY', 'revol_util': 75.0,
        'expected_pd_range': (0.40, 0.60)
    },
    {
        'name': 'FICO 500 - Grade D - Moderate DTI',
        'fico': 500, 'grade': 'D', 'dti': 30.0, 'loan_amnt': 30000, 'annual_inc': 65000,
        'emp_length': 5, 'term': '36 months', 'purpose': 'debt_consolidation',
        'home_ownership': 'MORTGAGE', 'state': 'IL', 'revol_util': 60.0,
        'expected_pd_range': (0.35, 0.55)
    },
    {
        'name': 'FICO 550 - Grade E - Low DTI',
        'fico': 550, 'grade': 'E', 'dti': 25.0, 'loan_amnt': 25000, 'annual_inc': 75000,
        'emp_length': 6, 'term': '36 months', 'purpose': 'credit_card',
        'home_ownership': 'MORTGAGE', 'state': 'WA', 'revol_util': 50.0,
        'expected_pd_range': (0.30, 0.50)
    },
    {
        'name': 'FICO 600 - Grade D - Low DTI',
        'fico': 600, 'grade': 'D', 'dti': 20.0, 'loan_amnt': 20000, 'annual_inc': 80000,
        'emp_length': 7, 'term': '36 months', 'purpose': 'home_improvement',
        'home_ownership': 'MORTGAGE', 'state': 'CO', 'revol_util': 40.0,
        'expected_pd_range': (0.25, 0.40)
    },
    
    # Edge cases
    {
        'name': 'FICO 300 - Grade G - Extreme Risk',
        'fico': 300, 'grade': 'G', 'dti': 55.0, 'loan_amnt': 35000, 'annual_inc': 35000,
        'emp_length': 1, 'term': '60 months', 'purpose': 'other',
        'home_ownership': 'RENT', 'state': 'OH', 'revol_util': 95.0,
        'expected_pd_range': (0.70, 0.90)
    },
    {
        'name': 'FICO 380 - Grade F - Very High DTI',
        'fico': 380, 'grade': 'F', 'dti': 60.0, 'loan_amnt': 40000, 'annual_inc': 50000,
        'emp_length': 2, 'term': '60 months', 'purpose': 'debt_consolidation',
        'home_ownership': 'RENT', 'state': 'MI', 'revol_util': 90.0,
        'expected_pd_range': (0.65, 0.85)
    },
]

print("\n" + "=" * 70)
print("Extended Low FICO Test Suite")
print("=" * 70)

def create_features(row_dict):
    """Create feature engineering matching training script"""
    df_input = pd.DataFrame([row_dict])
    
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
    
    # Reorder columns
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
    
    return X_transformed

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
for i, test_case in enumerate(test_cases, 1):
    print(f"\n[{i}/{len(test_cases)}] {test_case['name']}")
    print("-" * 70)
    print(f"  FICO: {test_case['fico']}")
    print(f"  Grade: {test_case['grade']}")
    print(f"  DTI: {test_case['dti']}%")
    print(f"  Loan: ${test_case['loan_amnt']:,}")
    print(f"  Income: ${test_case['annual_inc']:,}")
    print(f"  Employment: {test_case['emp_length']} years")
    
    # Create features
    X_transformed = create_features(test_case)
    
    # Get prediction
    pred_proba = calibrated_model.predict_proba(X_transformed)[0][1]
    
    expected_min, expected_max = test_case['expected_pd_range']
    in_range = expected_min <= pred_proba <= expected_max
    
    grade = get_risk_grade(pred_proba)
    decision = "approve" if pred_proba < 0.15 else "review"
    
    print(f"  Predicted PD: {pred_proba:.4f} ({pred_proba*100:.2f}%)")
    print(f"  Expected Range: {expected_min*100:.0f}%-{expected_max*100:.0f}%")
    print(f"  Risk Grade: {grade}")
    print(f"  Decision: {decision}")
    
    if in_range:
        print(f"  ✅ IN EXPECTED RANGE")
    else:
        if pred_proba < expected_min:
            print(f"  ⚠️  TOO LOW (expected at least {expected_min*100:.0f}%)")
        else:
            print(f"  ⚠️  TOO HIGH (expected at most {expected_max*100:.0f}%)")
    
    results.append({
        'name': test_case['name'],
        'fico': test_case['fico'],
        'grade': test_case['grade'],
        'predicted_pd': pred_proba,
        'expected_min': expected_min,
        'expected_max': expected_max,
        'in_range': in_range,
        'risk_grade': grade
    })

print("\n" + "=" * 70)
print("Summary")
print("=" * 70)

# Group by FICO range
fico_350_cases = [r for r in results if r['fico'] == 350]
fico_300_400_cases = [r for r in results if 300 <= r['fico'] < 400]
fico_400_500_cases = [r for r in results if 400 <= r['fico'] < 500]
fico_500_600_cases = [r for r in results if 500 <= r['fico'] < 600]

print(f"\nFICO 350 Cases: {len(fico_350_cases)}")
for r in fico_350_cases:
    status = "✅" if r['in_range'] else "⚠️"
    print(f"  {status} {r['name']}: {r['predicted_pd']*100:.2f}% (expected: {r['expected_min']*100:.0f}%-{r['expected_max']*100:.0f}%)")

print(f"\nFICO 300-400 Range: {len(fico_300_400_cases)} cases")
in_range_count = sum([r['in_range'] for r in fico_300_400_cases])
print(f"  In expected range: {in_range_count}/{len(fico_300_400_cases)} ({in_range_count/len(fico_300_400_cases)*100:.0f}%)")
avg_pd = np.mean([r['predicted_pd'] for r in fico_300_400_cases])
print(f"  Average PD: {avg_pd*100:.2f}%")

print(f"\nFICO 400-500 Range: {len(fico_400_500_cases)} cases")
in_range_count = sum([r['in_range'] for r in fico_400_500_cases])
print(f"  In expected range: {in_range_count}/{len(fico_400_500_cases)} ({in_range_count/len(fico_400_500_cases)*100:.0f}%)")
avg_pd = np.mean([r['predicted_pd'] for r in fico_400_500_cases])
print(f"  Average PD: {avg_pd*100:.2f}%")

print(f"\nFICO 500-600 Range: {len(fico_500_600_cases)} cases")
in_range_count = sum([r['in_range'] for r in fico_500_600_cases])
print(f"  In expected range: {in_range_count}/{len(fico_500_600_cases)} ({in_range_count/len(fico_500_600_cases)*100:.0f}%)")
avg_pd = np.mean([r['predicted_pd'] for r in fico_500_600_cases])
print(f"  Average PD: {avg_pd*100:.2f}%")

print(f"\nOverall: {len(results)} test cases")
overall_in_range = sum([r['in_range'] for r in results])
print(f"  In expected range: {overall_in_range}/{len(results)} ({overall_in_range/len(results)*100:.0f}%)")
overall_avg_pd = np.mean([r['predicted_pd'] for r in results])
print(f"  Average PD: {overall_avg_pd*100:.2f}%")

# Save results
results_df = pd.DataFrame(results)
results_df.to_csv("backend/models/extended_low_fico_test_results.csv", index=False)
print(f"\n✅ Results saved to backend/models/extended_low_fico_test_results.csv")

