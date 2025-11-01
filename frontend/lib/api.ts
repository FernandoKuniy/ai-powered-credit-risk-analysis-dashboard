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

export async function scoreApplication(payload: ScorePayload, accessToken?: string) {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch("/api/score", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type UnsavedApplication = ScorePayload & {
  pd: number;
  risk_grade: string;
  decision: string;
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