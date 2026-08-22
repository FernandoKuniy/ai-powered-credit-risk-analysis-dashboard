"use client";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_PROPS, CHART_GRID, CHART_INK, TOOLTIP_STYLE } from "../../lib/chartTheme";
import { formatThreshold } from "../../lib/format";
import { approvalCurve } from "../../lib/portfolioMath";

/**
 * What share of the portfolio clears, at every cut-off the simulator can reach.
 *
 * The step in this curve is where the applications actually sit: a portfolio whose
 * probabilities cluster around 8% is nearly flat until the line reaches 8% and then jumps.
 * That shape is the point, and it is why the old version, which plotted a straight `1 - t`
 * with no reference to any real probability, was worse than no chart.
 *
 * The vertical line is wherever the slider currently sits, so moving it moves the marker.
 */
export default function ApprovalCurveChart({
  pds,
  threshold,
}: {
  pds: number[];
  threshold: number;
}) {
  const data = approvalCurve(pds).map((point) => ({
    threshold: point.threshold * 100,
    approvalRate: point.approvalRate * 100,
  }));

  return (
    <section className="card">
      <h2 className="text-sm font-medium">Approval rate as the cut-off moves</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Worked out from the {pds.length.toLocaleString()}{" "}
        {pds.length === 1 ? "application" : "applications"} below, using the same rule the
        simulator applies.
      </p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid stroke={CHART_GRID} vertical={false} />
            <XAxis
              dataKey="threshold"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(value: number) => `${value}%`}
              {...AXIS_PROPS}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(value: number) => `${value}%`}
              {...AXIS_PROPS}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              separator=""
              formatter={(value: number) => [`${value.toFixed(1)}% would clear`, ""]}
              labelFormatter={(value: number) => `Cut-off at ${value}%`}
            />
            <ReferenceLine
              x={threshold * 100}
              stroke="var(--foreground)"
              strokeWidth={1}
              label={{
                value: formatThreshold(threshold),
                position: "top",
                fill: "var(--chart-axis)",
                fontSize: 12,
              }}
            />
            <Line
              type="stepAfter"
              dataKey="approvalRate"
              stroke={CHART_INK}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
