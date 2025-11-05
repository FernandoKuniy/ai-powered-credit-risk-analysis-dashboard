# Model Performance Report

## Executive Summary

This report documents the performance of the refined credit risk model trained on 150,000 samples with hyperparameter optimization and probability calibration, compared to the previous model trained on 5,000 samples.

## Training Metrics

### Dataset
- **Previous Model**: 5,000 rows
- **New Model**: 150,000 rows (30x increase)
- **Default Rate**: 17.83%

### Model Performance (Test Set)

| Metric | Base Model | Calibrated Model | Target |
|--------|------------|------------------|--------|
| **AUC-ROC** | 0.7110 | 0.7100 | > 0.75 |
| **Brier Score** | 0.1334 | 0.1336 | < 0.15 ✅ |
| **Precision @ 15%** | 0.2575 | 0.2679 | - |
| **Recall @ 15%** | 0.7696 | 0.7334 | - |
| **F1-Score @ 15%** | 0.3859 | 0.3924 | - |

### Key Findings

1. **Brier Score**: ✅ Meets target (< 0.15)
   - Base model: 0.1334
   - Calibrated model: 0.1336
   - Both models show good calibration quality

2. **AUC-ROC**: ⚠️ Below target (> 0.75)
   - Current: 0.7100 (calibrated)
   - Model shows moderate discrimination ability
   - Improvement needed for better risk separation

3. **Calibration**: 
   - Isotonic calibration applied to improve probability calibration
   - Calibrated model shows similar performance to base model
   - Calibration curve data available in `training_metrics.json`

## Test Case Validation Results

### Summary
- **Total Test Cases**: 10
- **Passed (PD in expected range)**: 2/10 (20%)
- **Decision Accuracy**: 8/10 (80%) - decisions match expected outcomes

### Detailed Results

#### ✅ Passed Test Cases

1. **Test Case 1: Excellent Credit Profile**
   - Predicted PD: 3.00% (Expected: 2-4%)
   - Risk Grade: A ✅
   - Decision: approve ✅

7. **Test Case 7: Very Poor Credit Profile**
   - Predicted PD: 57.38% (Expected: 45-60%)
   - Risk Grade: F ✅
   - Decision: review ✅

#### ⚠️ Failed Test Cases (PD out of range, but decision correct)

2. **Test Case 2: Good Credit Profile**
   - Predicted PD: 12.22% (Expected: 6-9%)
   - Decision: approve ✅ (correct despite higher PD)

4. **Test Case 4: Moderate Risk Profile**
   - Predicted PD: 35.31% (Expected: 18-25%)
   - Decision: review ✅

5. **Test Case 5: Higher Risk Profile**
   - Predicted PD: 40.08% (Expected: 28-35%)
   - Decision: review ✅

6. **Test Case 6: Low Income, High Loan Risk**
   - Predicted PD: 55.13% (Expected: 30-40%)
   - Decision: review ✅

8. **Test Case 8: Edge Case - High Income, Low Credit**
   - Predicted PD: 30.89% (Expected: 20-30%)
   - Decision: review ✅

9. **Test Case 9: Edge Case - Low Loan, Good Profile**
   - Predicted PD: 7.89% (Expected: 3-6%)
   - Decision: approve ✅

#### ❌ Failed Test Cases (PD out of range, decision incorrect)

3. **Test Case 3: Average Credit Profile**
   - Predicted PD: 29.90% (Expected: 12-16%)
   - Decision: review ❌ (expected approve)
   - **Issue**: Model overestimates risk significantly

10. **Test Case 10: Edge Case - Just Below Threshold**
    - Predicted PD: 23.56% (Expected: 13-15%)
    - Decision: review ❌ (expected approve)
    - **Issue**: Model overestimates risk near threshold

## Analysis

### Model Strengths

1. **High-Risk Detection**: Model performs well for very high-risk profiles (Test Case 7)
2. **Low-Risk Detection**: Model accurately identifies excellent credit profiles (Test Case 1)
3. **Decision Accuracy**: 80% of test cases have correct decisions despite PD estimation errors
4. **Calibration**: Good calibration quality (Brier Score < 0.15)

### Model Weaknesses

1. **Middle-Range Risk Overestimation**: Model consistently overestimates PD in the 10-30% range
   - Test Case 2: Expected 6-9%, Predicted 12.22%
   - Test Case 3: Expected 12-16%, Predicted 29.90%
   - Test Case 10: Expected 13-15%, Predicted 23.56%

2. **Moderate Risk Overestimation**: Model overestimates risk for moderate-risk profiles
   - Test Case 4: Expected 18-25%, Predicted 35.31%
   - Test Case 5: Expected 28-35%, Predicted 40.08%

3. **AUC-ROC**: Below target (0.7100 vs 0.75 target)
   - Indicates room for improvement in discrimination ability

### Root Causes

1. **Dataset Characteristics**: Training data may not fully represent all risk segments
2. **Feature Engineering**: May need additional features or transformations
3. **Model Complexity**: Current hyperparameters (max_depth=3) may be limiting model capacity
4. **Class Imbalance**: Default rate of 17.83% may require class weighting or sampling strategies

## Comparison: Old vs New Model

| Aspect | Old Model (5k) | New Model (150k) | Improvement |
|--------|----------------|------------------|-------------|
| Dataset Size | 5,000 | 150,000 | 30x larger |
| Hyperparameter Tuning | Fixed | Optimized | ✅ Systematic |
| Calibration | None | Isotonic | ✅ Improved |
| Validation Split | 80/20 | 80/10/10 | ✅ Better |
| Test Case Pass Rate | 2/10 (20%) | 2/10 (20%) | Same |
| Decision Accuracy | Unknown | 8/10 (80%) | ✅ Measured |

## Recommendations for Future Improvements

1. **Feature Engineering**
   - Add interaction features (e.g., loan_amnt / annual_inc)
   - Create derived features (e.g., debt-to-income buckets)
   - Consider polynomial features for non-linear relationships

2. **Model Architecture**
   - Experiment with deeper trees (max_depth > 3)
   - Try ensemble methods (stacking, blending)
   - Consider neural networks for complex patterns

3. **Data Quality**
   - Increase dataset size further (500k+ rows)
   - Ensure balanced representation across risk segments
   - Add temporal features if available

4. **Class Balancing**
   - Experiment with class weights
   - Try SMOTE or other oversampling techniques
   - Consider cost-sensitive learning

5. **Threshold Optimization**
   - Current threshold (15%) may not be optimal
   - Use ROC curve to find optimal threshold
   - Consider business-specific cost functions

6. **Model Monitoring**
   - Track prediction drift over time
   - Monitor calibration quality in production
   - Set up alerts for model performance degradation

## Conclusion

The refined model shows improvements in training methodology (larger dataset, hyperparameter optimization, calibration) but still struggles with accurate PD estimation in the middle-risk range. While decision accuracy is good (80%), the model's PD predictions need refinement for better calibration across all risk segments.

**Current Status**: 
- ✅ Training infrastructure improved
- ✅ Calibration implemented
- ⚠️ PD accuracy needs improvement
- ✅ Decision logic works well for most cases

**Next Steps**: Focus on feature engineering and model architecture improvements to better capture risk patterns in the 10-30% PD range.

