export type PortfolioData = {
  total_applications: number;
  avg_pd: number;
  approval_rate: number;
  default_rate: number;
  grade_distribution: Record<string, number>;
  recent_applications: Array<{
    created_at: string;
    loan_amnt: number;
    annual_inc: number;
    pd: number;
    risk_grade: string;
    decision: string;
  }>;
};

export type SimulationData = {
  threshold: number;
  approval_rate: number;
  expected_default_rate: number;
  applications_approved: number;
  applications_rejected: number;
};

export async function getPortfolio(accessToken?: string): Promise<PortfolioData> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  // Add cache-busting to ensure fresh data
  const res = await fetch("/api/portfolio", {
    method: "GET",
    headers,
    cache: "no-store", // Prevent caching
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function simulatePortfolio(threshold: number, accessToken?: string): Promise<SimulationData> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`/api/portfolio/simulate?threshold=${threshold}`, {
    method: "GET",
    headers,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
