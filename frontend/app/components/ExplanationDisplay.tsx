"use client";
import InfoIcon from "./InfoIcon";

interface FeatureContribution {
  feature: string;
  shap_value: number;
  impact: "positive" | "negative";
  contribution_pct: number;
  feature_key?: string | null;
  original_value?: string | null;
}

interface Explanation {
  top_features: FeatureContribution[];
  summary: string;
}

interface ExplanationDisplayProps {
  explanation: Explanation | null;
  pd?: number; // Optional PD value for context
}

// Feature explanations mapping
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

// Get explanation for a feature, using feature_key if available, otherwise feature name
function getFeatureExplanation(feature: FeatureContribution): string | null {
  // Try formatted feature name first (e.g., "DTI", "Loan Amount")
  if (FEATURE_EXPLANATIONS[feature.feature]) {
    return FEATURE_EXPLANATIONS[feature.feature];
  }
  
  // If feature_key exists, try to map it to formatted name
  if (feature.feature_key) {
    // Map backend keys to display names
    const keyToName: Record<string, string> = {
      'dti': 'DTI',
      'fico': 'FICO',
      'loan_amnt': 'Loan Amount',
      'annual_inc': 'Annual Income',
      'emp_length': 'Employment Length',
      'revol_util': 'Revolving Utilization',
      'loan_to_income': 'Loan-to-Income Ratio',
      'fico_dti_interaction': 'FICO-DTI Interaction',
      'revol_util_squared': 'Revolving Utilization²',
      'annual_inc_log': 'Log Annual Income',
      'dti_bucket': 'DTI Bucket',
      'fico_bucket': 'FICO Bucket',
      'lti_bucket': 'Loan-to-Income Bucket',
      'emp_stability': 'Employment Stability',
      'fico_grade_interaction': 'FICO-Grade Interaction',
      'dti_revol_interaction': 'DTI-Revolving Interaction',
      'income_term_interaction': 'Income-Term Interaction',
      'loan_purpose_risk': 'Loan Purpose Risk',
      'fico_squared': 'FICO²',
      'dti_squared': 'DTI²',
      'loan_amnt_squared': 'Loan Amount²',
      'income_per_year_employed': 'Income per Year Employed',
      'debt_service_ratio': 'Debt Service Ratio',
      'credit_utilization_ratio': 'Credit Utilization Ratio',
      'grade': 'Grade',
      'term': 'Term',
      'purpose': 'Purpose',
      'home_ownership': 'Home Ownership',
      'state': 'State',
    };
    
    const displayName = keyToName[feature.feature_key];
    if (displayName && FEATURE_EXPLANATIONS[displayName]) {
      return FEATURE_EXPLANATIONS[displayName];
    }
  }
  
  return null;
}

export default function ExplanationDisplay({ explanation, pd }: ExplanationDisplayProps) {
  if (!explanation) {
    return (
      <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-lg">
        <p className="text-white/60 text-sm">Explanation not available for this application.</p>
      </div>
    );
  }

  const { top_features, summary } = explanation;
  
  // Separate features into major contributors (top 3) and additional factors (rest)
  const majorContributors = top_features.slice(0, 3);
  const additionalFactors = top_features.slice(3);

  return (
    <div className="mt-6 space-y-4">
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Explanation</h3>
        <p className="text-white/80 mb-6 text-sm">{summary}</p>
        
        {/* Major Contributing Factors */}
        {majorContributors.length > 0 && (
          <div className="space-y-4 mb-6">
            <h4 className="text-sm font-semibold text-white/90 mb-3">Major Contributing Factors</h4>
            {majorContributors.map((feature, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-white">
                      {feature.feature}
                    </span>
                    {getFeatureExplanation(feature) && (
                      <InfoIcon
                        explanation={getFeatureExplanation(feature)!}
                        className="ml-0.5"
                        usePortal={true}
                        position="above"
                      />
                    )}
                    {feature.original_value && (
                      <span className="text-sm text-white/60 font-normal">
                        ({feature.original_value})
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    feature.impact === "positive"
                      ? "bg-red-900/30 text-red-300"
                      : "bg-green-900/30 text-green-300"
                  }`}>
                    {feature.impact === "positive" ? "↑ Increases Risk" : "↓ Decreases Risk"}
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      feature.impact === "positive"
                        ? "bg-red-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(feature.contribution_pct, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-white/60">
                  <span>Contribution: {feature.contribution_pct.toFixed(1)}%</span>
                  <div className="flex items-center gap-1">
                    <span>SHAP: {feature.shap_value > 0 ? "+" : ""}{feature.shap_value.toFixed(4)}</span>
                    <InfoIcon 
                      explanation="SHAP (SHapley Additive exPlanations) values show how much each feature contributes to the predicted probability of default. Positive values increase risk, negative values decrease risk. The magnitude indicates the strength of the contribution."
                      className="ml-1"
                      usePortal={true}
                      position="above"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Additional Factors */}
        {additionalFactors.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-white/10">
            <h4 className="text-sm font-semibold text-white/70 mb-3">Additional Factors</h4>
            {additionalFactors.map((feature, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white/80">
                      {feature.feature}
                    </span>
                    {getFeatureExplanation(feature) && (
                      <InfoIcon
                        explanation={getFeatureExplanation(feature)!}
                        className="ml-0.5"
                        usePortal={true}
                        position="above"
                      />
                    )}
                    {feature.original_value && (
                      <span className="text-xs text-white/50 font-normal">
                        ({feature.original_value})
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    feature.impact === "positive"
                      ? "bg-red-900/20 text-red-400"
                      : "bg-green-900/20 text-green-400"
                  }`}>
                    {feature.impact === "positive" ? "↑" : "↓"}
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      feature.impact === "positive"
                        ? "bg-red-500/70"
                        : "bg-green-500/70"
                    }`}
                    style={{ width: `${Math.min(feature.contribution_pct, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white/50">
                  <span>{feature.contribution_pct.toFixed(1)}%</span>
                  <span>{feature.shap_value > 0 ? "+" : ""}{feature.shap_value.toFixed(4)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


