/**
 * Shared Recharts styling, so the two panels on the dashboard read as one chart system.
 *
 * Everything resolves through the CSS variables declared in globals.css rather than being a
 * literal hex here, which is what keeps the charts following the OS theme without a
 * JavaScript media query duplicating the breakpoint.
 */
export const CHART_INK = "var(--chart-ink)";
export const CHART_GRID = "var(--chart-grid)";
export const CHART_AXIS = "var(--chart-axis)";

export const AXIS_PROPS = {
  stroke: CHART_AXIS,
  tickLine: false,
  axisLine: false,
  // 12px, matching the text-xs that carries metadata everywhere else.
  tick: { fill: CHART_AXIS, fontSize: 12 },
} as const;

export const TOOLTIP_STYLE = {
  backgroundColor: "var(--chart-surface)",
  border: "1px solid var(--chart-border)",
  borderRadius: "0.5rem", // rounded-lg: a tooltip floats, so it sits a tier below a card
  fontSize: "0.875rem",
  color: "var(--foreground)",
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
} as const;

/** Recharts draws its own cursor highlight behind the tooltip; keep it faint. */
export const TOOLTIP_CURSOR = { fill: "var(--chart-grid)" } as const;
