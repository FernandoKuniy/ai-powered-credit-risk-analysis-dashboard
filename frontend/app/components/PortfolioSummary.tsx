import { formatPd, formatRate, formatThreshold } from "../../lib/format";
import { DEFAULT_THRESHOLD } from "../../lib/policy";
import type { PortfolioData } from "../../lib/portfolio";

/**
 * Three numbers about the whole set of saved applications.
 *
 * It used to be four. The fourth was labelled "Expected Default Rate" and displayed
 * `default_rate`, which both the SQL function and its Python fallback assign straight from
 * `avg_pd` ("Default rate is same as avg_pd (using avg PD as proxy)", supabase-schema.sql).
 * So two cards sat side by side showing the identical figure under different names, implying
 * a second measurement that was never taken. The real expected-default figure, the average
 * probability among the applications that actually clear, is computed by the simulate
 * endpoint and shown by the policy simulator below.
 */
export default function PortfolioSummary({ portfolio }: { portfolio: PortfolioData }) {
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <Metric
        label="Applications"
        value={portfolio.total_applications.toLocaleString()}
        note="Scored and saved to your account."
      />
      <Metric
        label="Average probability of default"
        value={formatPd(portfolio.avg_pd)}
        note="Across every application, not just the approved ones."
      />
      <Metric
        label="Approval rate"
        value={formatRate(portfolio.approval_rate)}
        note={`Cleared the ${formatThreshold(DEFAULT_THRESHOLD)} cut-off when they were scored.`}
      />
    </section>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card">
      <h2 className="text-sm text-zinc-500">{label}</h2>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1.5 text-xs text-zinc-500">{note}</p>
    </div>
  );
}
