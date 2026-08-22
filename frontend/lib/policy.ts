/**
 * The approval policy, mirrored from the backend so the UI never states a cut-off the server
 * isn't actually applying.
 *
 * THRESHOLD is `THRESHOLD = 0.15` in backend/app.py, the value used when a decision is saved.
 * The min and max are the bounds on the simulate endpoint's `threshold` query parameter, so
 * the sliders cannot ask for a number the API would reject.
 */
export const DEFAULT_THRESHOLD = 0.15;
export const THRESHOLD_MIN = 0.01;
export const THRESHOLD_MAX = 0.25;

/** An application clears when its probability of default is strictly below the cut-off. */
export function decisionAt(pd: number, threshold: number): "approve" | "review" {
  return pd < threshold ? "approve" : "review";
}
