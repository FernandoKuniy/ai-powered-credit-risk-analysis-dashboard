/** One feature's SHAP contribution. `positive` means it pushed the probability up. */
export type FeatureContribution = {
  feature: string;
  shap_value: number;
  impact: "positive" | "negative";
  contribution_pct: number;
  feature_key?: string | null;
  original_value?: string | null;
};

export type Explanation = {
  top_features: FeatureContribution[];
  summary: string;
};

/** What POST /api/score returns. Mirrors ScoreResponse in backend/schemas.py. */
export type ScoreResponse = {
  pd: number;
  risk_grade: string;
  decision: string;
  explanation: Explanation | null;
};

export type ScorePayload = {
  loan_amnt: number;
  annual_inc: number;
  dti: number;
  emp_length: number;
  grade: string;
  term: string;
  purpose: string;
  home_ownership: string;
  state: string;
  revol_util: number;
  fico: number;
};

export async function scoreApplication(
  payload: ScorePayload,
  accessToken?: string,
): Promise<ScoreResponse> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch("/api/score", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await describeFailure(res));
  return res.json();
}

/**
 * A message worth showing someone.
 *
 * A failing upstream does not reliably put anything in the body: the score route returns a
 * bare 500 when the model service is unreachable, and `new Error("")` further up renders as
 * nothing at all, so the screen sat there looking like the click never happened. The status
 * is the floor, and FastAPI's `detail` field is used when there is one.
 */
async function describeFailure(res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  const trimmed = body.trim();
  if (!trimmed) return `The scoring service returned ${res.status} with no explanation.`;
  try {
    const parsed = JSON.parse(trimmed);
    const detail = parsed?.detail ?? parsed?.error;
    if (typeof detail === "string" && detail.trim()) return detail;
  } catch {
    // Not JSON. The raw text is more use than a generic message.
  }
  return trimmed;
}

export type UnsavedApplication = ScorePayload & {
  pd: number;
  risk_grade: string;
  decision: string;
  explanation: Explanation | null;
  timestamp: string; // ISO string of when it was scored
};

export async function saveApplication(application: UnsavedApplication, accessToken: string) {
  if (!accessToken) {
    throw new Error("Authentication required to save applications");
  }

  const res = await fetch("/api/applications/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify(application),
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Failed to save application");
  }
  
  return res.json();
}

// LocalStorage utilities for unsaved applications
const UNSAVED_APPLICATIONS_KEY = "unsaved_applications";

export function getUnsavedApplications(): UnsavedApplication[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(UNSAVED_APPLICATIONS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error reading unsaved applications from localStorage:", error);
    return [];
  }
}

export function addUnsavedApplication(application: UnsavedApplication) {
  if (typeof window === "undefined") return;
  
  try {
    const existing = getUnsavedApplications();
    // Add to the beginning of the array (most recent first)
    const updated = [application, ...existing];
    localStorage.setItem(UNSAVED_APPLICATIONS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Error saving application to localStorage:", error);
  }
}

export function clearUnsavedApplications() {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.removeItem(UNSAVED_APPLICATIONS_KEY);
  } catch (error) {
    console.error("Error clearing unsaved applications from localStorage:", error);
  }
}