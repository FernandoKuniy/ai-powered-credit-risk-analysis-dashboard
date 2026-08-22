"use client";
import { formatPd, formatRate, formatThreshold } from "../../lib/format";
import { DEFAULT_THRESHOLD, THRESHOLD_MAX, THRESHOLD_MIN } from "../../lib/policy";
import type { SimulationData } from "../../lib/portfolio";
import InfoIcon from "./InfoIcon";

/**
 * Move the cut-off across the whole portfolio and see what it costs.
 *
 * The numbers come from /portfolio/simulate rather than being worked out here, because the
 * expected default rate is the average probability among only the approved applications, and
 * the portfolio response does not carry enough to compute that for an arbitrary cut-off.
 *
 * The threshold is owned by the dashboard page, not by this component: the approval curve
 * chart draws a marker at the same value, and two copies of it would drift.
 */
export default function PolicySimulator({
  threshold,
  onThresholdChange,
  simulation,
  pending,
}: {
  threshold: number;
  onThresholdChange: (threshold: number) => void;
  simulation: SimulationData | null;
  pending: boolean;
}) {
  const isDefault = Math.abs(threshold - DEFAULT_THRESHOLD) < 0.0001;

  return (
    <section className="card">
      <div className="flex items-center gap-1.5">
        <h2 className="text-sm font-medium">Try a different cut-off</h2>
        <InfoIcon explanation="Nothing here is saved. Decisions already recorded against your applications keep the 15% cut-off they were scored at." />
      </div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Approving more applications means approving riskier ones. This is that trade, on your
        own portfolio.
      </p>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="portfolio-threshold" className="text-sm text-zinc-500">
            Approve anything under
          </label>
          <span className="text-sm font-medium tabular-nums">{formatThreshold(threshold)}</span>
        </div>
        <input
          id="portfolio-threshold"
          name="portfolio-threshold"
          type="range"
          className="slider mt-2"
          min={THRESHOLD_MIN}
          max={THRESHOLD_MAX}
          step={0.01}
          value={threshold}
          onChange={(event) => onThresholdChange(parseFloat(event.target.value))}
          aria-valuetext={`${formatThreshold(threshold)} probability of default`}
        />
        <div aria-hidden className="mt-1.5 flex justify-between text-xs tabular-nums text-zinc-400">
          <span>{formatThreshold(THRESHOLD_MIN)}</span>
          <span>{formatThreshold(THRESHOLD_MAX)}</span>
        </div>
      </div>

      <div
        // aria-live so a screen reader hears the new figures when the slider moves, rather
        // than the change happening silently somewhere below the control.
        aria-live="polite"
        className={`mt-5 border-t border-zinc-100 pt-5 dark:border-zinc-800 ${pending ? "opacity-50" : ""}`}
      >
        {simulation ? (
          <>
            <dl className="grid gap-5 sm:grid-cols-2">
              <Outcome
                label="Would clear"
                value={`${simulation.applications_approved.toLocaleString()} of ${(
                  simulation.applications_approved + simulation.applications_rejected
                ).toLocaleString()}`}
                note={`${formatRate(simulation.approval_rate)} of the portfolio.`}
              />
              <Outcome
                label="Expected to default, among those"
                value={formatPd(simulation.expected_default_rate)}
                note="The average probability across only the ones that clear."
              />
            </dl>
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              {simulation.applications_rejected.toLocaleString()}{" "}
              {simulation.applications_rejected === 1 ? "application" : "applications"} would go
              to a person instead.
              {!isDefault && " Your saved decisions still use 15%."}
            </p>
          </>
        ) : (
          <p className="text-sm text-zinc-500">Working out the numbers…</p>
        )}
      </div>
    </section>
  );
}

function Outcome({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div>
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
      <dd className="mt-1 text-xs text-zinc-500">{note}</dd>
    </div>
  );
}
