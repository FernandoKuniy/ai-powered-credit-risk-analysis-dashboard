"use client";
import { useState } from "react";
import { formatDate, formatMoney, formatPd } from "../../lib/format";
import { DEFAULT_THRESHOLD } from "../../lib/policy";
import type { PortfolioData } from "../../lib/portfolio";
import { DecisionBadge, RiskGradeBadge } from "./Badges";
import InfoIcon from "./InfoIcon";

const PER_PAGE = 10;

type Application = PortfolioData["recent_applications"][number];

export default function ApplicationsTable({
  applications,
  onSelect,
}: {
  applications: Application[];
  onSelect: (id: string) => void;
}) {
  const [page, setPage] = useState(1);
  // Derived, not stored: deleting the last row on the final page has to pull the page number
  // back with it, and a useState copy kept missing that and rendered an empty table.
  const pageCount = Math.max(1, Math.ceil(applications.length / PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PER_PAGE;
  const visible = applications.slice(start, start + PER_PAGE);

  if (applications.length === 0) {
    return (
      <section>
        <h2 className="text-sm font-medium">Your applications</h2>
        <p className="empty mt-3">Nothing saved yet.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-medium">Your applications</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        {/* The only horizontal scroll on the page, and it is scoped to the table so the body
            never scrolls sideways on a phone. */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-zinc-500 dark:border-zinc-800">
                <th className="px-4 py-3 font-medium">Scored</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-right font-medium">Income</th>
                <th className="px-4 py-3 text-right font-medium">Probability</th>
                <th className="px-4 py-3 font-medium">Grade</th>
                <th className="px-4 py-3 font-medium">
                  <span className="flex items-center gap-1.5">
                    Decision
                    <InfoIcon
                      explanation={`Anything under a ${Math.round(DEFAULT_THRESHOLD * 100)}% probability of default cleared automatically. The rest were flagged for a person to read.`}
                    />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((application) => (
                <tr
                  key={application.id}
                  // `relative` is what lets the button below stretch its hit area across the
                  // whole row: click anywhere, but the thing being clicked is a real button
                  // that a keyboard can reach and a screen reader announces.
                  className="relative border-b border-zinc-50 transition-colors last:border-0 hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900/60"
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onSelect(application.id)}
                      className="font-medium after:absolute after:inset-0 after:content-[''] hover:underline"
                    >
                      {formatDate(application.created_at)}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMoney(application.loan_amnt)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-500">
                    {formatMoney(application.annual_inc)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatPd(application.pd)}</td>
                  <td className="px-4 py-3">
                    <RiskGradeBadge grade={application.risk_grade} />
                  </td>
                  <td className="px-4 py-3">
                    <DecisionBadge decision={application.decision} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pageCount > 1 && (
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          total={applications.length}
          from={start + 1}
          to={Math.min(start + PER_PAGE, applications.length)}
          onChange={setPage}
        />
      )}
    </section>
  );
}

function Pagination({
  page,
  pageCount,
  total,
  from,
  to,
  onChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
  onChange: (page: number) => void;
}) {
  // First, last, and the pages either side of where you are. Everything else collapses, so a
  // 200-row list is 20 pages and still one row of buttons.
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
    (candidate) =>
      candidate === 1 ||
      candidate === pageCount ||
      (candidate >= page - 1 && candidate <= page + 1),
  );

  return (
    <nav
      aria-label="Application pages"
      className="mt-4 flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-xs tabular-nums text-zinc-500">
        {from} to {to} of {total.toLocaleString()}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-md px-2 py-1 text-sm text-zinc-500 transition-colors hover:text-zinc-900 disabled:opacity-40 disabled:hover:text-zinc-500 dark:hover:text-zinc-100"
        >
          Previous
        </button>
        {pages.map((candidate, index) => (
          <span key={candidate} className="flex items-center gap-1">
            {index > 0 && candidate - pages[index - 1] > 1 && (
              <span aria-hidden className="px-1 text-xs text-zinc-400">
                …
              </span>
            )}
            <button
              type="button"
              onClick={() => onChange(candidate)}
              aria-current={candidate === page ? "page" : undefined}
              className={`min-w-[1.75rem] rounded-md px-2 py-1 text-sm tabular-nums transition-colors ${
                candidate === page
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              {candidate}
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => onChange(Math.min(pageCount, page + 1))}
          disabled={page === pageCount}
          className="rounded-md px-2 py-1 text-sm text-zinc-500 transition-colors hover:text-zinc-900 disabled:opacity-40 disabled:hover:text-zinc-500 dark:hover:text-zinc-100"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
