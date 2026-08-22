"use client";
import { useState } from "react";
import { formatPd, formatThreshold } from "../../lib/format";
import { DEFAULT_THRESHOLD, THRESHOLD_MAX, THRESHOLD_MIN, decisionAt } from "../../lib/policy";
import InfoIcon from "./InfoIcon";
import ThresholdScale from "./ThresholdScale";

/**
 * "What if the cut-off were somewhere else?" for one application.
 *
 * The threshold is the only state here. The decision is derived from it on every render
 * rather than being stored alongside and updated in a handler, which is how the two used to
 * drift apart.
 */
export default function ThresholdSimulator({ pd }: { pd: number }) {
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const wouldApprove = decisionAt(pd, threshold) === "approve";
  const isDefault = Math.abs(threshold - DEFAULT_THRESHOLD) < 0.0001;

  return (
    <section className="card">
      <div className="flex items-center gap-1.5">
        <h2 className="text-sm font-medium">Move the cut-off</h2>
        <InfoIcon explanation="This only changes what you see here. The decision saved against this application still uses the 15% cut-off the backend applies." />
      </div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        This application&apos;s probability doesn&apos;t move. The line does.
      </p>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="threshold" className="text-sm text-zinc-500">
            Approve anything under
          </label>
          <span className="text-sm font-medium tabular-nums">{formatThreshold(threshold)}</span>
        </div>
        <input
          id="threshold"
          name="threshold"
          type="range"
          className="slider mt-2"
          min={THRESHOLD_MIN}
          max={THRESHOLD_MAX}
          step={0.01}
          value={threshold}
          onChange={(event) => setThreshold(parseFloat(event.target.value))}
          aria-valuetext={`${formatThreshold(threshold)} probability of default`}
        />
      </div>

      <div className="mt-5 border-t border-zinc-100 pt-5 dark:border-zinc-800">
        <ThresholdScale pd={pd} threshold={threshold} />
      </div>

      <p className="mt-5 text-sm text-zinc-600 dark:text-zinc-400">
        At a {formatThreshold(threshold)} cut-off this application{" "}
        <span
          className={`font-medium ${wouldApprove ? "text-green-600" : "text-amber-600 dark:text-amber-500"}`}
        >
          {wouldApprove ? "clears" : "goes to a person"}
        </span>
        , because its {formatPd(pd)} sits {wouldApprove ? "under" : "at or over"} the line.
        {!isDefault && " The saved decision still uses 15%."}
      </p>
    </section>
  );
}
