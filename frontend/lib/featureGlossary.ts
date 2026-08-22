import type { FeatureContribution } from "./api";

/**
 * Plain-English definitions for every feature the model can name in an explanation.
 *
 * This lives apart from the component that renders it because it is content: the wording gets
 * edited on its own schedule, and none of it is about how a row is laid out. Anything the
 * backend can put in `feature` or `feature_key` should have an entry here; a feature with no
 * entry renders without an info icon rather than with an empty one.
 */
const FEATURE_EXPLANATIONS: Record<string, string> = {
  // User-inputted features
  "DTI": "Debt-to-Income ratio: Monthly debt payments divided by monthly income, expressed as a percentage. Lower DTI indicates better ability to manage debt.",
  "FICO": "FICO credit score ranging from 300-850, indicating creditworthiness based on credit history. Higher scores indicate lower default risk.",
  "Loan Amount": "The total amount of money the borrower is requesting for the loan. Larger loans may carry higher risk.",
  "Annual Income": "The borrower's total annual income from all sources before taxes. Higher income generally indicates lower default risk.",
  "Employment Length": "Number of years the borrower has been employed at their current job. Longer employment suggests greater financial stability.",
  "Revolving Utilization": "Percentage of available revolving credit (credit cards) that is currently being used. Lower utilization indicates better credit management.",
  "Grade": "The initial loan grade assigned by the lender (A=best, G=worst). This reflects the lender's initial risk assessment.",
  "Term": "The length of time over which the loan will be repaid (typically 36 or 60 months). Longer terms may increase risk.",
  "Purpose": "The intended use of the loan funds. Different purposes carry different risk levels (e.g., debt consolidation vs. home improvement).",
  "Home Ownership": "The borrower's housing status: RENT, MORTGAGE, OWN (no mortgage), or OTHER. Home ownership can indicate financial stability.",
  "State": "The two-letter state code where the borrower resides. Regional economic factors can influence default risk.",
  
  // Engineered features
  "Loan-to-Income Ratio": "The ratio of loan amount to annual income. Lower ratios indicate the borrower can more easily afford the loan payments.",
  "FICO-DTI Interaction": "A combined metric that captures the relationship between credit score and debt burden. Higher values indicate better credit management relative to debt load.",
  "Revolving Utilization²": "The squared value of revolving utilization, capturing non-linear effects where very high utilization significantly increases risk.",
  "Log Annual Income": "The natural logarithm of annual income, which helps normalize income distributions and better capture income's impact on risk.",
  "DTI Bucket": "DTI categorized into risk buckets: Low (<15%), Medium (15-25%), High (>25%). Helps capture threshold effects in debt burden.",
  "FICO Bucket": "FICO score categorized into risk buckets: Very Low (<650), Low (650-700), Medium (700-750), High (>750). Captures non-linear credit score effects.",
  "Loan-to-Income Bucket": "Loan-to-income ratio categorized into buckets: Low (<0.2), Medium (0.2-0.4), High (>0.4). Helps identify affordability thresholds.",
  "Employment Stability": "Employment length categorized into stability buckets: New (<2 years), Medium (2-5 years), Stable (>5 years). Longer employment indicates stability.",
  "FICO-Grade Interaction": "Combines credit score with lender-assigned grade to capture cases where the model's assessment differs from the lender's initial grade.",
  "DTI-Revolving Interaction": "Captures the combined effect of debt-to-income ratio and credit card utilization, identifying borrowers with multiple debt concerns.",
  "Income-Term Interaction": "The relationship between annual income and loan term. Higher income relative to term length indicates better ability to repay.",
  "Loan Purpose Risk": "A risk-weighted score based on loan purpose, where purposes like small business or debt consolidation carry higher default risk.",
  "FICO²": "The squared value of FICO score, capturing non-linear effects where very low credit scores disproportionately increase risk.",
  "DTI²": "The squared value of DTI, capturing non-linear effects where very high debt-to-income ratios significantly increase default probability.",
  "Loan Amount²": "The squared value of loan amount, capturing non-linear effects where very large loans carry disproportionately higher risk.",
  "Income per Year Employed": "Annual income divided by years of employment. Higher values indicate higher earning potential or career advancement.",
  "Debt Service Ratio": "Monthly loan payment divided by monthly income. Measures the portion of income needed to service this specific loan.",
  "Credit Utilization Ratio": "Another measure of revolving credit utilization, normalized to a 0-1 scale. Lower values indicate better credit management.",
};

const KEY_TO_NAME: Record<string, string> = {
  "dti": "DTI",
  "fico": "FICO",
  "loan_amnt": "Loan Amount",
  "annual_inc": "Annual Income",
  "emp_length": "Employment Length",
  "revol_util": "Revolving Utilization",
  "loan_to_income": "Loan-to-Income Ratio",
  "fico_dti_interaction": "FICO-DTI Interaction",
  "revol_util_squared": "Revolving Utilization²",
  "annual_inc_log": "Log Annual Income",
  "dti_bucket": "DTI Bucket",
  "fico_bucket": "FICO Bucket",
  "lti_bucket": "Loan-to-Income Bucket",
  "emp_stability": "Employment Stability",
  "fico_grade_interaction": "FICO-Grade Interaction",
  "dti_revol_interaction": "DTI-Revolving Interaction",
  "income_term_interaction": "Income-Term Interaction",
  "loan_purpose_risk": "Loan Purpose Risk",
  "fico_squared": "FICO²",
  "dti_squared": "DTI²",
  "loan_amnt_squared": "Loan Amount²",
  "income_per_year_employed": "Income per Year Employed",
  "debt_service_ratio": "Debt Service Ratio",
  "credit_utilization_ratio": "Credit Utilization Ratio",
  "grade": "Grade",
  "term": "Term",
  "purpose": "Purpose",
  "home_ownership": "Home Ownership",
  "state": "State",
};
    

/** Look up a definition by display name first, then by the backend's raw feature key. */
export function getFeatureExplanation(feature: FeatureContribution): string | null {
  if (FEATURE_EXPLANATIONS[feature.feature]) {
    return FEATURE_EXPLANATIONS[feature.feature];
  }

  if (feature.feature_key) {
    const displayName = KEY_TO_NAME[feature.feature_key];
    if (displayName && FEATURE_EXPLANATIONS[displayName]) {
      return FEATURE_EXPLANATIONS[displayName];
    }
  }

  return null;
}
