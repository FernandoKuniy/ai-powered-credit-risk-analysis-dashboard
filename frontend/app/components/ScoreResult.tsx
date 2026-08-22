import { describePd, formatPd, formatThreshold } from "../../lib/format";
import { DEFAULT_THRESHOLD } from "../../lib/policy";
import { DecisionBadge, RiskGradeBadge } from "./Badges";

/**
 * What the model came back with.
 *
 * The probability leads because it is the only thing the model actually predicts; the grade
 * and the decision are both derived from it. Each of the three carries a sentence saying what
 * it means, so no coloured badge or bare percentage is left to be interpreted on its own.
 */
export default function ScoreResult({
  pd,
  riskGrade,
  decision,
  submittedGrade,
}: {
  pd: number;
  riskGrade: string;
  decision: string;
  submittedGrade: string | null;
}) {
  const approved = decision === "approve";

  return (
    <section className="card">
      <h2 className="text-sm text-zinc-500">Probability of default</h2>
      <p className="mt-1 text-4xl font-semibold tabular-nums">{formatPd(pd)}</p>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{describePd(pd)}</p>

      <div className="mt-5 grid gap-5 border-t border-zinc-100 pt-5 sm:grid-cols-2 dark:border-zinc-800">
        <div>
          <h3 className="text-sm text-zinc-500">Risk grade</h3>
          <div className="mt-1.5">
            <RiskGradeBadge grade={riskGrade} />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Worked out from the probability above, not from the grade you entered.
          </p>
        </div>
        <div>
          <h3 className="text-sm text-zinc-500">
            Decision at the {formatThreshold(DEFAULT_THRESHOLD)} cut-off
          </h3>
          <div className="mt-1.5">
            <DecisionBadge decision={decision} />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {approved
              ? "Under the cut-off, so it clears without anyone reading it."
              : "At or over the cut-off, so a person has to read it before anything happens."}
          </p>
        </div>
      </div>

      {submittedGrade && <GradeComparison submitted={submittedGrade} derived={riskGrade} pd={pd} />}
    </section>
  );
}

/**
 * The single most confusing thing on this screen is that you type in a grade and get a
 * different grade back. Amber when they disagree, because it is worth understanding rather
 * than a mistake; a quiet line when they match, because agreement is not news.
 */
function GradeComparison({
  submitted,
  derived,
  pd,
}: {
  submitted: string;
  derived: string;
  pd: number;
}) {
  if (submitted === derived) {
    return (
      <p className="mt-5 border-t border-zinc-100 pt-4 text-xs text-zinc-500 dark:border-zinc-800">
        The model landed on grade {derived} too, the same one you entered.
      </p>
    );
  }

  return (
    <div className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
      You entered grade {submitted}, and the model came out at {derived}. It read your grade as
      one input among eleven, predicted {formatPd(pd)}, and then mapped that number to its own
      grade. Disagreeing with the grade it was given is the model doing its job.
    </div>
  );
}
