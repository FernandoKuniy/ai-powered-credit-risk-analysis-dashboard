export type ApplicationDetail = {
  id: string;
  created_at: string;
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
  pd: number;
  risk_grade: string;
  decision: string;
  explanation: {
    top_features: Array<{
      feature: string;
      shap_value: number;
      impact: "positive" | "negative";
      contribution_pct: number;
    }>;
    summary: string;
  } | null;
};

export type PortfolioData = {
  total_applications: number;
  avg_pd: number;
  approval_rate: number;
  default_rate: number;
  grade_distribution: Record<string, number>;
  recent_applications: Array<{
    id: string;
    created_at: string;
    loan_amnt: number;
    annual_inc: number;
    pd: number;
    risk_grade: string;
    decision: string;
    explanation: ApplicationDetail['explanation'];
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

  // Add cache-busting to ensure fresh data (especially important in production)
  // Using timestamp query param to bypass any proxy/CDN caching
  const timestamp = Date.now();
  const res = await fetch(`/api/portfolio?t=${timestamp}`, {
    method: "GET",
    headers,
    cache: "no-store", // Prevent browser caching
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

export async function getApplication(applicationId: string, accessToken: string): Promise<ApplicationDetail> {
  if (!accessToken) {
    throw new Error("Authentication required");
  }

  const res = await fetch(`/api/applications/${applicationId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Failed to fetch application");
  }
  
  return res.json();
}

export async function deleteApplication(applicationId: string, accessToken: string): Promise<void> {
  if (!accessToken) {
    throw new Error("Authentication required");
  }

  const res = await fetch(`/api/applications/${applicationId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    const errorData = await res.json().catch(() => ({ error: errorText }));
    throw new Error(errorData.error || errorData.detail || "Failed to delete application");
  }
}
