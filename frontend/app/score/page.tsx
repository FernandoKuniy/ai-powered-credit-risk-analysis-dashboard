"use client";
import { useState } from "react";
import { scoreApplication } from "../../lib/api";
import Navigation from "../components/Navigation";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../../lib/auth";
import InfoIcon from "../components/InfoIcon";

export default function ScorePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      loan_amnt: Number(form.get("loan_amnt")),
      annual_inc: Number(form.get("annual_inc")),
      dti: Number(form.get("dti")),
      emp_length: Number(form.get("emp_length")),
      grade: String(form.get("grade")),
      term: String(form.get("term")),
      purpose: String(form.get("purpose")),
      home_ownership: String(form.get("home_ownership")),
      state: String(form.get("state")),
      revol_util: Number(form.get("revol_util")),
      fico: Number(form.get("fico")),
    };
    setLoading(true); setError(null);
    try {
      const r = await scoreApplication(payload, session?.access_token);
      setResult(r);
    } catch (err: any) {
      setError(err?.message || "Request failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute>
      <main>
        <Navigation />
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Scoring Form</h2>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          {/* numeric fields */}
          <label className="block"><span className="label flex items-center gap-2">Loan Amount <InfoIcon explanation="The total amount of money the borrower is requesting for the loan." /></span>
            <input name="loan_amnt" type="number" className="input" defaultValue={10000} required />
          </label>
          <label className="block"><span className="label flex items-center gap-2">Annual Income <InfoIcon explanation="The borrower's total annual income from all sources before taxes." /></span>
            <input name="annual_inc" type="number" className="input" defaultValue={80000} required />
          </label>
          <label className="block"><span className="label flex items-center gap-2">DTI <InfoIcon explanation="Debt-to-Income ratio: Monthly debt payments divided by monthly income, expressed as a percentage." /></span>
            <input name="dti" type="number" step="0.01" className="input" defaultValue={12.5} required />
          </label>
          <label className="block"><span className="label flex items-center gap-2">Employment Length (years) <InfoIcon explanation="Number of years the borrower has been employed at their current job." /></span>
            <input name="emp_length" type="number" className="input" defaultValue={4} required />
          </label>
          <label className="block"><span className="label flex items-center gap-2">Revolving Utilization <InfoIcon explanation="Percentage of available revolving credit that is currently being used (credit card balances vs limits)." /></span>
            <input name="revol_util" type="number" step="0.1" className="input" defaultValue={35} required />
          </label>
          <label className="block"><span className="label flex items-center gap-2">FICO <InfoIcon explanation="FICO credit score ranging from 300-850, indicating creditworthiness based on credit history." /></span>
            <input name="fico" type="number" className="input" defaultValue={720} required />
          </label>

          {/* categorical fields */}
          <label className="block"><span className="label flex items-center gap-2">Grade <InfoIcon explanation="Loan grade assigned by the lender (A=best, G=worst) based on credit risk assessment." /></span>
            <select name="grade" className="input" defaultValue="B">
              {"ABCDEFG".split("").map((g) => <option key={g}>{g}</option>)}
            </select>
          </label>
          <label className="block"><span className="label flex items-center gap-2">Term <InfoIcon explanation="The length of time over which the loan will be repaid (36 or 60 months)." /></span>
            <select name="term" className="input" defaultValue="36 months">
              <option>36 months</option><option>60 months</option>
            </select>
          </label>
          <label className="block md:col-span-2"><span className="label flex items-center gap-2">Purpose <InfoIcon explanation="The intended use of the loan funds (e.g., debt_consolidation, credit_card, home_improvement, etc.)." /></span>
            <input name="purpose" className="input" defaultValue="debt_consolidation" />
          </label>
          <label className="block"><span className="label flex items-center gap-2">Home Ownership <InfoIcon explanation="The borrower's housing status: RENT, MORTGAGE, OWN (no mortgage), or OTHER." /></span>
            <select name="home_ownership" className="input" defaultValue="RENT">
              <option>RENT</option><option>MORTGAGE</option><option>OWN</option><option>OTHER</option>
            </select>
          </label>
          <label className="block"><span className="label flex items-center gap-2">State <InfoIcon explanation="The two-letter state code where the borrower resides (e.g., MA for Massachusetts)." /></span>
            <input name="state" className="input" defaultValue="MA" />
          </label>

          <div className="md:col-span-2 flex gap-3 pt-2">
            <button className="btn" type="submit" disabled={loading}>{loading ? "Scoring…" : "Score"}</button>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
        </form>

        {result && (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="card"><div className="text-white/60">PD</div>
              <div className="text-2xl font-semibold">{(result.pd * 100).toFixed(2)}%</div></div>
            <div className="card"><div className="text-white/60">Risk Grade</div>
              <div className="text-2xl font-semibold">{result.risk_grade}</div></div>
            <div className="card"><div className="text-white/60">Decision</div>
              <div className="text-2xl font-semibold capitalize">{result.decision}</div></div>
          </div>
        )}
        </div>
      </main>
    </ProtectedRoute>
  );
}