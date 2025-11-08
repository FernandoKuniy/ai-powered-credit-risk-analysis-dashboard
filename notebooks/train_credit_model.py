import pandas as pd
import json
import joblib
import numpy as np
from sklearn.model_selection import train_test_split, RandomizedSearchCV, cross_val_score
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from xgboost import XGBClassifier
from sklearn.metrics import (
    roc_auc_score, 
    brier_score_loss,
    precision_score,
    recall_score,
    f1_score,
    classification_report
)
import matplotlib.pyplot as plt
from datetime import datetime

print("=" * 60)
print("Credit Risk Model Training - Enhanced Version")
print("=" * 60)

# Load 150k dataset
print("\n[1/7] Loading dataset...")
df = pd.read_csv("data/raw/lendingclub_sample_150k.csv")
print(f"   Loaded {len(df)} rows")
print(f"   Default rate: {df['default'].mean():.2%}")

# Load synthetic data for low FICO scores (< 614)
try:
    synthetic_df = pd.read_csv("data/raw/lendingclub_synthetic_low_fico.csv")
    print(f"   Loaded {len(synthetic_df)} synthetic samples (FICO < 614)")
    print(f"   Synthetic default rate: {synthetic_df['default'].mean():.2%}")
    print(f"   Synthetic FICO range: {synthetic_df['fico'].min():.0f} - {synthetic_df['fico'].max():.0f}")
    
    # Combine original and synthetic data
    df = pd.concat([df, synthetic_df], ignore_index=True)
    print(f"   Combined dataset: {len(df)} rows")
    print(f"   Combined default rate: {df['default'].mean():.2%}")
except FileNotFoundError:
    print("   ⚠️  Synthetic data not found. Run generate_synthetic_data.py first.")
    print("   Continuing with original dataset only.")

# Convert emp_length to numeric (years)
print("\n[2/7] Preprocessing and feature engineering...")
df["emp_length"] = (
    df["emp_length"]
    .astype(str)
    .str.extract(r"(\d+)")   # extract digits
    .fillna(0)
    .astype(float)
)

# Feature engineering
print("   Adding engineered features...")
# Existing features
df["loan_to_income"] = df["loan_amnt"] / (df["annual_inc"] + 1)  # Add 1 to avoid division by zero
df["fico_dti_interaction"] = df["fico"] * (1 / (df["dti"] + 1))  # Higher FICO + lower DTI = better
df["revol_util_squared"] = df["revol_util"] ** 2  # Non-linear relationship for high utilization
df["annual_inc_log"] = np.log1p(df["annual_inc"])  # Log transform for income

# Risk bucket features: Categorize continuous variables into risk buckets
print("   Adding risk bucket features...")
# DTI buckets: low (<15), medium (15-25), high (>25)
df["dti_bucket"] = pd.cut(df["dti"], bins=[-np.inf, 15, 25, np.inf], labels=[0, 1, 2]).astype(float)

# FICO buckets: excellent (>750), good (700-750), fair (650-700), poor (<650)
df["fico_bucket"] = pd.cut(df["fico"], bins=[-np.inf, 650, 700, 750, np.inf], labels=[0, 1, 2, 3]).astype(float)

# Loan-to-income buckets: low (<0.2), medium (0.2-0.4), high (>0.4)
df["lti_bucket"] = pd.cut(df["loan_to_income"], bins=[-np.inf, 0.2, 0.4, np.inf], labels=[0, 1, 2]).astype(float)

# Employment stability buckets: stable (>5yrs), moderate (2-5yrs), new (<2yrs)
df["emp_stability"] = pd.cut(df["emp_length"], bins=[-np.inf, 2, 5, np.inf], labels=[0, 1, 2]).astype(float)

# Interaction features: Capture relationships between multiple variables
print("   Adding interaction features...")
# FICO-Grade interaction (captures alignment between credit score and loan grade)
# Map grade to numeric: A=1, B=2, C=3, D=4, E=5, F=6, G=7
grade_map = {"A": 1, "B": 2, "C": 3, "D": 4, "E": 5, "F": 6, "G": 7}
df["grade_numeric"] = df["grade"].map(grade_map).fillna(0)
df["fico_grade_interaction"] = df["fico"] * df["grade_numeric"]

# DTI-Revolving utilization interaction (debt burden)
df["dti_revol_interaction"] = df["dti"] * (df["revol_util"] / 100)  # Normalize revol_util to 0-1

# Income-Term interaction (payment capacity: higher income + shorter term = better)
df["term_numeric"] = df["term"].str.extract(r"(\d+)").astype(float).fillna(36)
df["income_term_interaction"] = df["annual_inc"] / (df["term_numeric"] + 1)

# Loan-Purpose risk interaction (purpose-specific risk weights)
# Higher risk purposes: small_business, other, debt_consolidation
purpose_risk_weights = {
    "small_business": 1.5, "other": 1.3, "debt_consolidation": 1.2,
    "credit_card": 1.1, "home_improvement": 1.0, "major_purchase": 0.9,
    "car": 0.8, "medical": 0.8, "house": 0.7, "vacation": 0.7, "wedding": 0.6,
    "moving": 0.6, "educational": 0.5
}
df["purpose_risk_weight"] = df["purpose"].map(purpose_risk_weights).fillna(1.0)
df["loan_purpose_risk"] = df["loan_amnt"] * df["purpose_risk_weight"]

# Polynomial features: Capture non-linear relationships
print("   Adding polynomial features...")
df["fico_squared"] = df["fico"] ** 2  # Captures diminishing returns at high FICO
df["dti_squared"] = df["dti"] ** 2  # Exponential risk at high DTI
df["loan_amnt_squared"] = df["loan_amnt"] ** 2  # Non-linear loan size risk

# Ratio and normalized features: Derived metrics for better interpretability
print("   Adding ratio and normalized features...")
# Income per year employed (income stability indicator)
df["income_per_year_employed"] = df["annual_inc"] / (df["emp_length"] + 1)

# Debt service ratio (monthly payment burden)
monthly_payment = df["loan_amnt"] / df["term_numeric"]
df["debt_service_ratio"] = monthly_payment / (df["annual_inc"] / 12 + 1)

# Credit utilization ratio (normalized 0-1)
df["credit_utilization_ratio"] = df["revol_util"] / 100

# FICO risk penalty: Explicitly penalizes low FICO scores
# Formula: max(0, (650 - fico) / 100)
# This makes extreme low FICO values (300-400) stand out more prominently
# FICO 350 → penalty = 3.0, FICO 300 → penalty = 3.5, FICO 650+ → penalty = 0.0
df["fico_risk_penalty"] = np.maximum(0, (650 - df["fico"]) / 100)

# Drop intermediate helper columns (not used in model, only for feature engineering)
intermediate_cols = ["grade_numeric", "term_numeric", "purpose_risk_weight"]
df = df.drop(columns=[col for col in intermediate_cols if col in df.columns])

y = df["default"].astype(int)
X = df.drop(columns=["default"])

num = [
    # Original features
    "loan_amnt", "annual_inc", "dti", "emp_length", "revol_util", "fico",
    # Existing engineered features
    "loan_to_income", "fico_dti_interaction", "revol_util_squared", "annual_inc_log",
    # Risk bucket features
    "dti_bucket", "fico_bucket", "lti_bucket", "emp_stability",
    # Interaction features
    "fico_grade_interaction", "dti_revol_interaction", "income_term_interaction", "loan_purpose_risk",
    # Polynomial features
    "fico_squared", "dti_squared", "loan_amnt_squared",
    # Ratio and normalized features
    "income_per_year_employed", "debt_service_ratio", "credit_utilization_ratio",
    # FICO risk penalty: Explicit penalty for low FICO scores
    "fico_risk_penalty"
]
cat = ["grade", "term", "purpose", "home_ownership", "state"]

# Check sklearn version for compatibility
import sklearn
sklearn_version = sklearn.__version__.split('.')
sklearn_major = int(sklearn_version[0])
sklearn_minor = int(sklearn_version[1])

if sklearn_major > 1 or (sklearn_major == 1 and sklearn_minor >= 2):
    # sklearn >= 1.2
    pre = ColumnTransformer([
        ("num","passthrough",num),
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat),
    ])
else:
    # sklearn < 1.2
    pre = ColumnTransformer([
        ("num","passthrough",num),
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse=False), cat),
    ])

# Create train/validation/test split (80/10/10)
print("\n[3/7] Creating train/validation/test split (80/10/10)...")
X_train, X_temp, y_train, y_temp = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)
X_val, X_test, y_val, y_test = train_test_split(
    X_temp, y_temp, test_size=0.5, stratify=y_temp, random_state=42
)

print(f"   Train set: {len(X_train)} rows ({len(X_train)/len(X):.1%})")
print(f"   Validation set: {len(X_val)} rows ({len(X_val)/len(X):.1%})")
print(f"   Test set: {len(X_test)} rows ({len(X_test)/len(X):.1%})")

# Calculate class weights for imbalanced data
print("\n[4/7] Hyperparameter optimization...")
from sklearn.utils.class_weight import compute_sample_weight
# XGBoost uses scale_pos_weight for binary classification
default_rate = y_train.mean()
scale_pos_weight = (1 - default_rate) / default_rate  # Weight for positive class
print(f"   Default rate: {default_rate:.2%}")
print(f"   Scale pos weight: {scale_pos_weight:.2f}")

base_clf = XGBClassifier(
    eval_metric="logloss",
    tree_method="hist",
    random_state=42,
    n_jobs=-1,
    scale_pos_weight=scale_pos_weight  # Handle class imbalance
)

param_grid = {
    'clf__n_estimators': [400, 500, 600, 700],
    'clf__max_depth': [4, 5, 6, 7],  # Deeper trees for more complex patterns
    'clf__learning_rate': [0.03, 0.05, 0.07, 0.1],
    'clf__reg_lambda': [1.0, 1.5, 2.0, 2.5],
    'clf__reg_alpha': [0.0, 0.1, 0.5],  # L1 regularization
    'clf__subsample': [0.8, 0.9, 1.0],
    'clf__colsample_bytree': [0.8, 0.9, 1.0],
    'clf__min_child_weight': [1, 3, 5]  # Minimum samples in leaf
}

pipe = Pipeline([("pre", pre), ("clf", base_clf)])

# Use RandomizedSearchCV for faster optimization (75 iterations for more thorough search)
random_search = RandomizedSearchCV(
    pipe,
    param_grid,
    n_iter=75,  # Increased iterations for better hyperparameter search
    cv=5,
    scoring='roc_auc',
    n_jobs=-1,
    random_state=42,
    verbose=1
)

print("   Running randomized search (this may take 10-30 minutes)...")
random_search.fit(X_train, y_train)

print(f"\n   Best parameters:")
for param, value in random_search.best_params_.items():
    print(f"     {param}: {value}")
print(f"   Best CV score (AUC): {random_search.best_score_:.4f}")

best_pipe = random_search.best_estimator_

# Model calibration
print("\n[5/7] Calibrating model probabilities...")
# Get base XGBoost model for calibration
base_model = best_pipe.named_steps['clf']

# Fit base model on training data
X_train_transformed = best_pipe.named_steps['pre'].transform(X_train)
base_model.fit(X_train_transformed, y_train)

# Calibrate on validation set
X_val_transformed = best_pipe.named_steps['pre'].transform(X_val)
calibrated_model = CalibratedClassifierCV(
    base_model,
    method='isotonic',
    cv='prefit'
)
calibrated_model.fit(X_val_transformed, y_val)

# Save both models separately:
# - Base pipeline (model.pkl): Used for SHAP explanations (TreeExplainer compatibility)
# - Calibrated model (model_calibrated.pkl): Used for accurate probability predictions
# In production, SHAP uses the base model from inside the calibrated wrapper
# to ensure explanations align with the model making predictions

# Comprehensive evaluation
print("\n[6/7] Evaluating model performance...")

# Transform test data
X_test_transformed = best_pipe.named_steps['pre'].transform(X_test)

# Get predictions from base model
y_pred_proba_base = base_model.predict_proba(X_test_transformed)[:, 1]
y_pred_proba_cal = calibrated_model.predict_proba(X_test_transformed)[:, 1]

# Calculate metrics for base model
auc_base = roc_auc_score(y_test, y_pred_proba_base)
brier_base = brier_score_loss(y_test, y_pred_proba_base)

# Calculate metrics for calibrated model
auc_cal = roc_auc_score(y_test, y_pred_proba_cal)
brier_cal = brier_score_loss(y_test, y_pred_proba_cal)

print(f"\n   Base Model Metrics:")
print(f"     AUC-ROC: {auc_base:.4f}")
print(f"     Brier Score: {brier_base:.4f}")

print(f"\n   Calibrated Model Metrics:")
print(f"     AUC-ROC: {auc_cal:.4f}")
print(f"     Brier Score: {brier_cal:.4f}")

# Performance at 15% threshold
threshold = 0.15
y_pred_threshold_base = (y_pred_proba_base >= threshold).astype(int)
y_pred_threshold_cal = (y_pred_proba_cal >= threshold).astype(int)

precision_base = precision_score(y_test, y_pred_threshold_base, zero_division=0)
recall_base = recall_score(y_test, y_pred_threshold_base, zero_division=0)
f1_base = f1_score(y_test, y_pred_threshold_base, zero_division=0)

precision_cal = precision_score(y_test, y_pred_threshold_cal, zero_division=0)
recall_cal = recall_score(y_test, y_pred_threshold_cal, zero_division=0)
f1_cal = f1_score(y_test, y_pred_threshold_cal, zero_division=0)

print(f"\n   Performance at 15% Threshold (Base Model):")
print(f"     Precision: {precision_base:.4f}")
print(f"     Recall: {recall_base:.4f}")
print(f"     F1-Score: {f1_base:.4f}")

print(f"\n   Performance at 15% Threshold (Calibrated Model):")
print(f"     Precision: {precision_cal:.4f}")
print(f"     Recall: {recall_cal:.4f}")
print(f"     F1-Score: {f1_cal:.4f}")

# Calibration curve
fraction_of_positives_base, mean_predicted_value_base = calibration_curve(
    y_test, y_pred_proba_base, n_bins=10
)
fraction_of_positives_cal, mean_predicted_value_cal = calibration_curve(
    y_test, y_pred_proba_cal, n_bins=10
)

# Risk grade distribution (using calibrated model)
def risk_grade(pd_val: float) -> str:
    if pd_val < 0.05:  return "A"
    elif pd_val < 0.10:  return "B"
    elif pd_val < 0.20:  return "C"
    elif pd_val < 0.30:  return "D"
    elif pd_val < 0.40:  return "E"
    elif pd_val < 0.60:  return "F"
    else: return "G"

y_pred_grades = [risk_grade(pd) for pd in y_pred_proba_cal]
grade_dist = pd.Series(y_pred_grades).value_counts().sort_index()
print(f"\n   Risk Grade Distribution (Calibrated Model):")
for grade, count in grade_dist.items():
    print(f"     {grade}: {count} ({count/len(y_pred_grades):.1%})")

# Save model artifacts
print("\n[7/7] Saving model artifacts...")

# Save the base pipeline (without calibration for SHAP compatibility)
joblib.dump(best_pipe, "backend/models/model.pkl")

# Save calibrated model separately
joblib.dump(calibrated_model, "backend/models/model_calibrated.pkl")

# Save feature order
json.dump({"feature_order": X.columns.tolist()}, open("backend/models/feature_meta.json","w"))

# Save validation metrics
metrics = {
    "training_date": datetime.now().isoformat(),
    "dataset_size": len(df),
    "train_size": len(X_train),
    "validation_size": len(X_val),
    "test_size": len(X_test),
    "default_rate": float(df["default"].mean()),
    "best_hyperparameters": {k.replace("clf__", ""): v for k, v in random_search.best_params_.items()},
    "base_model": {
        "auc_roc": float(auc_base),
        "brier_score": float(brier_base),
        "threshold_15pct": {
            "precision": float(precision_base),
            "recall": float(recall_base),
            "f1_score": float(f1_base)
        }
    },
    "calibrated_model": {
        "auc_roc": float(auc_cal),
        "brier_score": float(brier_cal),
        "threshold_15pct": {
            "precision": float(precision_cal),
            "recall": float(recall_cal),
            "f1_score": float(f1_cal)
        },
        "calibration_curve": {
            "fraction_of_positives": [float(x) for x in fraction_of_positives_cal],
            "mean_predicted_value": [float(x) for x in mean_predicted_value_cal]
        }
    },
    "risk_grade_distribution": {k: int(v) for k, v in grade_dist.to_dict().items()}
}

json.dump(metrics, open("backend/models/training_metrics.json", "w"), indent=2)

print("   ✅ Saved base model to backend/models/model.pkl")
print("   ✅ Saved calibrated model to backend/models/model_calibrated.pkl")
print("   ✅ Saved feature metadata to backend/models/feature_meta.json")
print("   ✅ Saved training metrics to backend/models/training_metrics.json")

print("\n" + "=" * 60)
print("Training Complete!")
print("=" * 60)
print(f"\nFinal Model Performance:")
print(f"  AUC-ROC: {auc_cal:.4f}")
print(f"  Brier Score: {brier_cal:.4f}")
print(f"  Precision @ 15%: {precision_cal:.4f}")
print(f"  Recall @ 15%: {recall_cal:.4f}")
