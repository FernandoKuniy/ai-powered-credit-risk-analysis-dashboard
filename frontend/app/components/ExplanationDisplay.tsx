"use client";

interface FeatureContribution {
  feature: string;
  shap_value: number;
  impact: "positive" | "negative";
  contribution_pct: number;
}

interface Explanation {
  top_features: FeatureContribution[];
  summary: string;
}

interface ExplanationDisplayProps {
  explanation: Explanation | null;
  pd?: number; // Optional PD value for context
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
                  <span className="text-base font-semibold text-white">
                    {feature.feature}
                  </span>
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
                <div className="flex justify-between text-xs text-white/60">
                  <span>Contribution: {feature.contribution_pct.toFixed(1)}%</span>
                  <span>SHAP: {feature.shap_value > 0 ? "+" : ""}{feature.shap_value.toFixed(4)}</span>
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
                  <span className="text-sm font-medium text-white/80">
                    {feature.feature}
                  </span>
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

