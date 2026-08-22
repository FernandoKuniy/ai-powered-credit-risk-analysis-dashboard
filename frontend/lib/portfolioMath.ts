import { THRESHOLD_MAX, THRESHOLD_MIN } from "./policy";

export type CurvePoint = {
  threshold: number;
  /** Share of the portfolio that clears this threshold, 0 to 1. */
  approvalRate: number;
};

/**
 * How much of the portfolio clears, at every cut-off in the simulator's range.
 *
 * This replaces a loop that computed `total * (1 - t)` and divided it by `total`, which is
 * just `1 - t`: a straight line from 99% down to 75% that was identical for every user and
 * never touched a single probability. It looked like analysis and was a redrawn axis.
 *
 * The rule here is the one the /portfolio/simulate endpoint applies (`pd < threshold`, see
 * backend/app.py), run over the probabilities the portfolio response already carries, so the
 * curve and the simulator's numbers cannot disagree.
 */
export function approvalCurve(pds: number[], step = 0.01): CurvePoint[] {
  const points: CurvePoint[] = [];
  if (pds.length === 0) return points;

  // Integer cents avoid the floating-point drift that `t += 0.02` accumulates, which used to
  // make the last point land at 0.24999999999999997.
  const from = Math.round(THRESHOLD_MIN * 100);
  const to = Math.round(THRESHOLD_MAX * 100);
  const by = Math.max(1, Math.round(step * 100));

  for (let cents = from; cents <= to; cents += by) {
    const threshold = cents / 100;
    const approved = pds.reduce((count, pd) => (pd < threshold ? count + 1 : count), 0);
    points.push({ threshold, approvalRate: approved / pds.length });
  }
  return points;
}
