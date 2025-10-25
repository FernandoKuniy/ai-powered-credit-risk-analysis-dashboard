"use client";
import { useState } from "react";
import { scoreApplication } from "../../lib/api";
import Navigation from "../components/Navigation";

export default function ScorePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
      const r = await scoreApplication(payload);
      setResult(r);
      console.log("score:", r);
    } catch (err: any) {
      setError(err?.message || "Request failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <Navigation />
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Scoring Form</h2>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        {/* numeric fields */}
        <label className="block"><span className="label">Loan Amount</span>
          <input name="loan_amnt" type="number" className="input" defaultValue={10000} required />
        </label>
        <label className="block"><span className="label">Annual Income</span>
          <input name="annual_inc" type="number" className="input" defaultValue={80000} required />
        </label>
        <label className="block"><span className="label">DTI</span>
          <input name="dti" type="number" step="0.01" className="input" defaultValue={12.5} required />
        </label>
        <label className="block"><span className="label">Employment Length (years)</span>
          <input name="emp_length" type="number" className="input" defaultValue={4} required />
        </label>
        <label className="block"><span className="label">Revolving Utilization</span>
          <input name="revol_util" type="number" step="0.1" className="input" defaultValue={35} required />
        </label>
        <label className="block"><span className="label">FICO</span>
          <input name="fico" type="number" className="input" defaultValue={720} required />
        </label>

        {/* categorical fields */}
        <label className="block"><span className="label">Grade</span>
          <select name="grade" className="input" defaultValue="B">
            {"ABCDEFG".split("").map((g) => <option key={g}>{g}</option>)}
          </select>
        </label>
        <label className="block"><span className="label">Term</span>
          <select name="term" className="input" defaultValue="36 months">
            <option>36 months</option><option>60 months</option>
          </select>
        </label>
        <label className="block md:col-span-2"><span className="label">Purpose</span>
          <input name="purpose" className="input" defaultValue="debt_consolidation" />
        </label>
        <label className="block"><span className="label">Home Ownership</span>
          <select name="home_ownership" className="input" defaultValue="RENT">
            <option>RENT</option><option>MORTGAGE</option><option>OWN</option><option>OTHER</option>
          </select>
        </label>
        <label className="block"><span className="label">State</span>
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
  );
}