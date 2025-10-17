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

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function scoreApplication(payload: ScorePayload) {
  const res = await fetch(`${BASE}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}