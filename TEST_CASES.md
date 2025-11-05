# Model Accuracy Test Cases

## Test Case 1: Excellent Credit Profile
**Input:**
- Loan Amount: 15,000
- Annual Income: 120,000
- DTI: 8.5
- Employment Length: 12 years
- Grade: A
- Term: 36 months
- Purpose: home_improvement
- Home Ownership: MORTGAGE
- State: CA
- Revolving Utilization: 15.0
- FICO: 780

**Expected Results:**
- PD: ~3-7% (based on Grade A: 5.0%, adjusted for excellent FICO 780 and low DTI 8.5)
- Risk Grade: A (PD < 5%)
- Decision: approve (PD < 15%)

**Rationale:** High income, low DTI, excellent FICO, long employment, low utilization → very low risk

---

## Test Case 2: Good Credit Profile
**Input:**
- Loan Amount: 25,000
- Annual Income: 85,000
- DTI: 12.0
- Employment Length: 8 years
- Grade: B
- Term: 36 months
- Purpose: debt_consolidation
- Home Ownership: MORTGAGE
- State: TX
- Revolving Utilization: 25.0
- FICO: 720

**Expected Results:**
- PD: ~9-13% (based on Grade B: 11.3%, adjusted for good FICO 720 and moderate DTI 12.0)
- Risk Grade: B (PD < 10%)
- Decision: approve (PD < 15%)

**Rationale:** Good income, moderate DTI, good FICO, stable employment → low risk

---

## Test Case 3: Average Credit Profile
**Input:**
- Loan Amount: 20,000
- Annual Income: 65,000
- DTI: 18.5
- Employment Length: 5 years
- Grade: C
- Term: 60 months
- Purpose: credit_card
- Home Ownership: RENT
- State: FL
- Revolving Utilization: 45.0
- FICO: 680

**Expected Results:**
- PD: ~18-25% (based on Grade C: 19.8%, adjusted for average FICO 680, high DTI 18.5, and 60-month term)
- Risk Grade: C (PD < 20%)
- Decision: review (PD >= 15%)

**Rationale:** Average income, moderate-high DTI, average FICO → moderate risk

---

## Test Case 4: Moderate Risk Profile
**Input:**
- Loan Amount: 30,000
- Annual Income: 55,000
- DTI: 22.0
- Employment Length: 3 years
- Grade: D
- Term: 60 months
- Purpose: debt_consolidation
- Home Ownership: RENT
- State: NY
- Revolving Utilization: 60.0
- FICO: 650

**Expected Results:**
- PD: ~25-32% (based on Grade D: 27.8%, adjusted for lower FICO 650, high DTI 22.0, and 60-month term)
- Risk Grade: D (PD < 30%)
- Decision: review (PD >= 15%)

**Rationale:** Lower income, high DTI, lower FICO, shorter employment, high utilization → higher risk

---

## Test Case 5: Higher Risk Profile
**Input:**
- Loan Amount: 35,000
- Annual Income: 50,000
- DTI: 28.0
- Employment Length: 2 years
- Grade: E
- Term: 60 months
- Purpose: credit_card
- Home Ownership: RENT
- State: IL
- Revolving Utilization: 75.0
- FICO: 620

**Expected Results:**
- PD: ~32-40% (based on Grade E: 34.7%, adjusted for lower FICO 620, very high DTI 28.0, and 60-month term)
- Risk Grade: E (PD < 40%)
- Decision: review (PD >= 15%)

**Rationale:** Lower income relative to loan, high DTI, lower FICO, short employment, high utilization → high risk

---

## Test Case 6: Low Income, High Loan Risk
**Input:**
- Loan Amount: 40,000
- Annual Income: 45,000
- DTI: 25.0
- Employment Length: 4 years
- Grade: F
- Term: 60 months
- Purpose: major_purchase
- Home Ownership: RENT
- State: GA
- Revolving Utilization: 55.0
- FICO: 635

**Expected Results:**
- PD: ~40-50% (based on Grade F: 44.3%, adjusted for lower FICO 635, high DTI 25.0, and 60-month term)
- Risk Grade: F (PD < 60%)
- Decision: review (PD >= 15%)

**Rationale:** High loan-to-income ratio, moderate DTI but low income, lower FICO → high risk

---

## Test Case 7: Very Poor Credit Profile
**Input:**
- Loan Amount: 15,000
- Annual Income: 40,000
- DTI: 35.0
- Employment Length: 1 year
- Grade: G
- Term: 60 months
- Purpose: other
- Home Ownership: RENT
- State: OH
- Revolving Utilization: 90.0
- FICO: 580

**Expected Results:**
- PD: ~48-58% (based on Grade G: 51.3%, adjusted for poor FICO 580, very high DTI 35.0, and 60-month term)
- Risk Grade: F or G (depending on exact PD)
- Decision: review (PD >= 15%)

**Rationale:** Very low income, very high DTI, poor FICO, short employment, maxed out credit → very high risk

---

## Test Case 8: Edge Case - High Income, Low Credit
**Input:**
- Loan Amount: 20,000
- Annual Income: 150,000
- DTI: 30.0
- Employment Length: 2 years
- Grade: D
- Term: 60 months
- Purpose: small_business
- Home Ownership: MORTGAGE
- State: WA
- Revolving Utilization: 80.0
- FICO: 600

**Expected Results:**
- PD: ~25-35% (based on Grade D: 27.8%, adjusted for low FICO 600, very high DTI 30.0, but high income helps somewhat)
- Risk Grade: D or E (depending on exact PD)
- Decision: review (PD >= 15%)

**Rationale:** High income helps, but very high DTI, low FICO, short employment, high utilization → elevated risk despite income

---

## Test Case 9: Edge Case - Low Loan, Good Profile
**Input:**
- Loan Amount: 5,000
- Annual Income: 75,000
- DTI: 10.0
- Employment Length: 10 years
- Grade: B
- Term: 36 months
- Purpose: car
- Home Ownership: OWN
- State: MA
- Revolving Utilization: 20.0
- FICO: 750

**Expected Results:**
- PD: ~6-10% (based on Grade B: 11.3%, adjusted for excellent FICO 750, low DTI 10.0, and very low loan-to-income ratio)
- Risk Grade: B (PD < 10%)
- Decision: approve (PD < 15%)

**Rationale:** Very low loan relative to income, excellent profile, low utilization → very low risk

---

## Test Case 10: Edge Case - Just Below Threshold
**Input:**
- Loan Amount: 18,000
- Annual Income: 60,000
- DTI: 16.0
- Employment Length: 6 years
- Grade: C
- Term: 36 months
- Purpose: medical
- Home Ownership: MORTGAGE
- State: NC
- Revolving Utilization: 35.0
- FICO: 670

**Expected Results:**
- PD: ~16-22% (based on Grade C: 19.8%, adjusted for moderate FICO 670, moderate DTI 16.0, and 36-month term)
- Risk Grade: C (PD < 20%)
- Decision: review (PD >= 15%)

**Rationale:** Mixed signals - moderate income, moderate DTI, decent FICO, but purpose and other factors could push it near threshold

---

## Testing Notes:
1. Test each case and compare actual PD to expected range
2. Verify risk grade assignment matches PD ranges:
   - A: < 5%
   - B: < 10%
   - C: < 20%
   - D: < 30%
   - E: < 40%
   - F: < 60%
   - G: >= 60%
3. Verify decision logic (approve if PD < 15%, review if >= 15%)
4. If actual results deviate significantly from expectations, investigate:
   - Model training data quality
   - Feature importance alignment
   - Potential data leakage or bias

