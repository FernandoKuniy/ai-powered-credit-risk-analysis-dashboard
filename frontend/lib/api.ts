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