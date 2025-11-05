# Model Training Documentation

## Overview

This document describes the training process, parameters, and validation metrics for the credit risk analysis model.

## Training Date

November 4, 2025

## Dataset

- **Source**: LendingClub loan data
- **Training Dataset Size**: 150,000 rows
- **Default Rate**: 17.83%
- **Data Split**:
  - Training: 120,000 rows (80%)
  - Validation: 15,000 rows (10%)
  - Test: 15,000 rows (10%)

## Preprocessing

### Features
- **Numerical Features**: `loan_amnt`, `annual_inc`, `dti`, `emp_length`, `revol_util`, `fico`
- **Categorical Features**: `grade`, `term`, `purpose`, `home_ownership`, `state`

### Preprocessing Steps
1. Convert `emp_length` to numeric (extract years from string)
2. One-hot encode categorical features
3. Pass through numerical features without scaling

## Model Architecture

### Base Model
- **Algorithm**: XGBoost Classifier
- **Hyperparameters** (optimized via RandomizedSearchCV):
  - `n_estimators`: 500
  - `max_depth`: 3
  - `learning_rate`: 0.05
  - `reg_lambda`: 1.5
  - `subsample`: 0.8
  - `colsample_bytree`: 0.9
  - `tree_method`: hist
  - `eval_metric`: logloss

### Calibration
- **Method**: Isotonic Calibration
- **Calibrated on**: Validation set (15,000 rows)
- **Rationale**: XGBoost probabilities are often poorly calibrated; calibration ensures PD predictions match actual default rates

## Hyperparameter Optimization

- **Method**: RandomizedSearchCV
- **CV Folds**: 5
- **Iterations**: 50
- **Scoring Metric**: ROC-AUC
- **Best CV Score**: 0.7074

## Model Performance Metrics

### Base Model (Test Set)
- **AUC-ROC**: 0.7110
- **Brier Score**: 0.1334
- **Performance at 15% Threshold**:
  - Precision: 0.2575
  - Recall: 0.7696
  - F1-Score: 0.3859

### Calibrated Model (Test Set)
- **AUC-ROC**: 0.7100
- **Brier Score**: 0.1336
- **Performance at 15% Threshold**:
  - Precision: 0.2679
  - Recall: 0.7334
  - F1-Score: 0.3924

## Risk Grade Distribution (Test Set)

| Grade | Count | Percentage |
|-------|-------|------------|
| A     | 1,364 | 9.1%       |
| B     | 2,874 | 19.2%      |
| C     | 5,630 | 37.5%      |
| D     | 3,035 | 20.2%      |
| E     | 1,447 | 9.6%       |
| F     | 649   | 4.3%       |
| G     | 1     | 0.0%       |

## Calibration Curve Analysis

The calibration curve shows how well-calibrated the model's probability predictions are:
- **Well-calibrated**: Predicted PD should match actual default rate in each bin
- **Calibration Method**: Isotonic regression
- **Calibration Data**: Validation set (15,000 rows)

## Model Artifacts

- **Base Model**: `backend/models/model.pkl`
- **Calibrated Model**: `backend/models/model_calibrated.pkl`
- **Feature Metadata**: `backend/models/feature_meta.json`
- **Training Metrics**: `backend/models/training_metrics.json`

## Training Script

The training script (`notebooks/train_credit_model.py`) includes:
1. Dataset loading and preprocessing
2. Train/validation/test split
3. Hyperparameter optimization
4. Model calibration
5. Comprehensive evaluation metrics
6. Model artifact saving

## Improvements Over Previous Model

- **Dataset Size**: Increased from 5,000 to 150,000 rows (30x increase)
- **Hyperparameter Optimization**: Systematic search instead of fixed parameters
- **Probability Calibration**: Added isotonic calibration for better PD accuracy
- **Comprehensive Validation**: Train/validation/test split with detailed metrics

## Notes

- Training time: ~20-30 minutes on modern CPU
- Model uses XGBoost's histogram-based tree method for efficiency
- SHAP explanations use the base (uncalibrated) model for compatibility
- Calibrated model is used for PD predictions in production

