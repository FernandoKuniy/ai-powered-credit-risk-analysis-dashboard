"use client";
import { useEffect, useRef } from "react";
import { formatDateTime, formatEnumLabel, formatMoney, formatPd } from "../../lib/format";
import { DEFAULT_THRESHOLD } from "../../lib/policy";
import type { ApplicationDetail as Application } from "../../lib/portfolio";
import { DecisionBadge, RiskGradeBadge } from "./Badges";
import ExplanationDisplay from "./ExplanationDisplay";

/**
 * One saved application, opened over the table.
 *
 * This is the only thing in the app that genuinely floats above other content, which is why
 * it is also the only place with a backdrop blur and a shadow. Escape closes it and focus
 * moves into the panel on open, neither of which the previous version did.
 */
export default function ApplicationDetail({
  application,
  loading,
  error,
  deleting,
  onClose,
  onDelete,
}: {
  application: Application | null;
  loading: boolean;
  error: string | null;
  deleting: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    // Locking the page behind the panel stops the background scrolling under a fixed overlay,
    // which on a trackpad reads as the panel itself having come loose.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-detail-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        // max-h with its own scroll rather than a fixed height: an explanation with twenty
        // factors is a lot taller than one with three.
        className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-200 bg-[var(--background)] shadow-xl dark:border-zinc-800"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-100 bg-[var(--background)] px-5 py-4 dark:border-zinc-800">
          <h2 id="application-detail-title" className="text-sm font-medium">
            Saved application
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting || loading || !application}
              className="rounded-md px-2 py-1 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-950/50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md px-2 py-1 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-5">
          {error && (
            <p
              role="alert"
              className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
            >
              {error}
            </p>
          )}

          {loading || !application ? (
            <p className="py-8 text-sm text-zinc-500">Loading…</p>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm text-zinc-500">Probability of default</h3>
                <p className="mt-1 text-3xl font-semibold tabular-nums">
                  {formatPd(application.pd)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <RiskGradeBadge grade={application.risk_grade} />
                  <DecisionBadge decision={application.decision} />
                  <span className="text-xs text-zinc-500">
                    at the {Math.round(DEFAULT_THRESHOLD * 100)}% cut-off
                  </span>
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-5 dark:border-zinc-800">
                <h3 className="text-sm font-medium">What was entered</h3>
                <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <Detail label="Loan amount" value={formatMoney(application.loan_amnt)} />
                  <Detail label="Annual income" value={formatMoney(application.annual_inc)} />
                  <Detail label="Debt-to-income" value={`${application.dti}%`} />
                  <Detail
                    label="Years at current job"
                    value={`${application.emp_length} ${application.emp_length === 1 ? "year" : "years"}`}
                  />
                  <Detail label="FICO score" value={String(application.fico)} />
                  <Detail label="Credit card usage" value={`${application.revol_util}%`} />
                  <Detail label="Lender-assigned grade" value={application.grade} />
                  <Detail label="Term" value={application.term} />
                  <Detail label="Purpose" value={formatEnumLabel(application.purpose)} />
                  <Detail label="Housing" value={formatEnumLabel(application.home_ownership)} />
                  <Detail label="State" value={application.state} />
                  <Detail label="Scored" value={formatDateTime(application.created_at)} />
                </dl>
              </div>

              <ExplanationDisplay explanation={application.explanation} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-zinc-500">{label}</dt>
      {/* break-words rather than truncate: these are short values, but a malformed state code
          or a pasted purpose should wrap rather than be silently cut off. */}
      <dd className="mt-0.5 break-words text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}
