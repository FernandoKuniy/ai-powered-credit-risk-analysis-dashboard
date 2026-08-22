"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_PROPS, CHART_GRID, CHART_INK, TOOLTIP_CURSOR, TOOLTIP_STYLE } from "../../lib/chartTheme";

/**
 * How the saved applications spread across the grades the model assigned.
 *
 * All seven bars are drawn even where the count is zero, because A through G is a fixed
 * scale and dropping the empty ones would quietly rescale the picture between visits.
 */
export default function GradeDistributionChart({
  distribution,
}: {
  distribution: Record<string, number>;
}) {
  const data = "ABCDEFG".split("").map((grade) => ({
    grade,
    count: distribution[grade] ?? 0,
  }));

  return (
    <section className="card">
      <h2 className="text-sm font-medium">Grades the model assigned</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Each grade is a band of predicted probability. A is the lowest risk.
      </p>
      {/* Recharts needs a height it can measure, and a bar chart's content does not grow with
          the data: seven categories is seven categories. */}
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid stroke={CHART_GRID} vertical={false} />
            <XAxis dataKey="grade" {...AXIS_PROPS} />
            <YAxis allowDecimals={false} {...AXIS_PROPS} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={TOOLTIP_CURSOR}
              // Recharts joins name and value with " : " unless the separator is cleared, so
              // the whole phrase goes in as the value and the name is dropped.
              separator=""
              formatter={(value: number) => [
                `${value} ${value === 1 ? "application" : "applications"}`,
                "",
              ]}
              labelFormatter={(grade: string) => `Grade ${grade}`}
            />
            <Bar dataKey="count" fill={CHART_INK} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
