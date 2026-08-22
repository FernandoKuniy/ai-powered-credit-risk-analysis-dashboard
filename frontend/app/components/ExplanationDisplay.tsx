"use client";
import type { Explanation, FeatureContribution } from "../../lib/api";
import { getFeatureExplanation } from "../../lib/featureGlossary";
import InfoIcon from "./InfoIcon";

/**
 * Which of the applicant's numbers moved the probability, and by how much.
 *
 * Three factors are shown, and the rest go behind a native <details>. The model returns
 * however many it wants to, and a list of fifteen bars is a list nobody reads: the first
 * three are the answer to "why", and everything after that is for someone who has already
 * decided they want the whole picture.
 *
 * Red raises the probability and green lowers it, and neither colour appears without the
 * words next to it, because "red" on a credit screen could just as easily be read as
 * "rejected".
 */
export default function ExplanationDisplay({ explanation }: { explanation: Explanation | null }) {
  if (!explanation || explanation.top_features.length === 0) {
    return (
      <p className="empty">The model didn&apos;t return a factor breakdown for this one.</p>
    );
  }

  const { top_features, summary } = explanation;
  const leading = top_features.slice(0, 3);
  const rest = top_features.slice(3);

  return (
    <section className="card">
      <h2 className="text-sm font-medium">What moved the number</h2>
      {summary && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{summary}</p>}

      <ul className="mt-5 space-y-5">
        {leading.map((feature) => (
          <li key={feature.feature}>
            <FactorRow feature={feature} />
          </li>
        ))}
      </ul>

      {rest.length > 0 && (
        <details className="group mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <summary className="cursor-pointer list-none text-sm text-zinc-500 transition-colors hover:text-zinc-900 [&::-webkit-details-marker]:hidden dark:hover:text-zinc-100">
            <span className="group-open:hidden">
              Show the other {rest.length} {rest.length === 1 ? "factor" : "factors"}
            </span>
            <span className="hidden group-open:inline">Hide the other factors</span>
          </summary>
          <ul className="mt-4 space-y-4">
            {rest.map((feature) => (
              <li key={feature.feature}>
                <FactorRow feature={feature} compact />
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function FactorRow({
  feature,
  compact = false,
}: {
  feature: FeatureContribution;
  compact?: boolean;
}) {
  const raisesRisk = feature.impact === "positive";
  const definition = getFeatureExplanation(feature);
  // Contributions come back as percentages and are capped here rather than in the model, so a
  // bar can never run past its track if the backend ever returns something over 100.
  const width = `${Math.min(Math.max(feature.contribution_pct, 0), 100)}%`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 items-center gap-1.5">
          {/* Engineered feature names get long ("DTI-Revolving Interaction"), so this wraps
              rather than truncating: there is nowhere sensible to put a tooltip for a name. */}
          <span
            className={`break-words ${compact ? "text-sm text-zinc-600 dark:text-zinc-400" : "text-sm font-medium"}`}
          >
            {feature.feature}
          </span>
          {feature.original_value && (
            <span className="shrink-0 text-xs tabular-nums text-zinc-500">
              {feature.original_value}
            </span>
          )}
          {definition && <InfoIcon explanation={definition} />}
        </div>
        <span
          className={`shrink-0 text-xs font-medium ${
            raisesRisk ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-500"
          }`}
        >
          {raisesRisk ? "Raises the risk" : "Lowers the risk"}
        </span>
      </div>

      <div
        aria-hidden
        className={`mt-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 ${compact ? "h-1.5" : "h-2"}`}
      >
        <div
          className={`h-full rounded-full ${raisesRisk ? "bg-red-500" : "bg-green-600"}`}
          style={{ width }}
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-zinc-500">
        <span className="tabular-nums">
          {feature.contribution_pct.toFixed(1)}% of what moved the number
        </span>
        <span className="flex shrink-0 items-center gap-1 tabular-nums text-zinc-400">
          SHAP {feature.shap_value > 0 ? "+" : ""}
          {feature.shap_value.toFixed(4)}
          <InfoIcon explanation="SHAP is the method used to split the prediction across the inputs. Each value is how far that one input pushed this borrower's probability away from the model's average borrower. Positive pushes it up, negative pulls it down." />
        </span>
      </div>
    </div>
  );
}
