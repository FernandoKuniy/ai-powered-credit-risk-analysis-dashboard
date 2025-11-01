"use client";
import { useState } from "react";
import Link from "next/link";
import { scoreApplication, addUnsavedApplication, type UnsavedApplication } from "../../lib/api";
import Navigation from "../components/Navigation";
import { useAuth } from "../../lib/auth";
import InfoIcon from "../components/InfoIcon";

export default function ScorePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [simulatedThreshold, setSimulatedThreshold] = useState(0.25); // Default threshold matching backend
  const [submittedGrade, setSubmittedGrade] = useState<string | null>(null); // Store the input grade for display
  const { session, user } = useAuth();

  const purposeOptions = [
    "car",
    "credit_card",
    "debt_consolidation",
    "home_improvement",
    "house",
    "major_purchase",
    "medical",
    "moving",
    "other",
    "renewable_energy",
    "small_business",
    "vacation",
  ];

  const formatPurposeLabel = (value: string) => {
    return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const inputGrade = String(form.get("grade"));
    const payload = {
      loan_amnt: Number(form.get("loan_amnt")),
      annual_inc: Number(form.get("annual_inc")),
      dti: Number(form.get("dti")),
      emp_length: Number(form.get("emp_length")),
      grade: inputGrade,
      term: String(form.get("term")),
      purpose: String(form.get("purpose")),
      home_ownership: String(form.get("home_ownership")),
      state: String(form.get("state")),
      revol_util: Number(form.get("revol_util")),
      fico: Number(form.get("fico")),
    };
    setLoading(true); setError(null);
    setSubmittedGrade(inputGrade); // Store the input grade for display
    try {
      const r = await scoreApplication(payload, session?.access_token);
      setResult(r);
      // Reset simulation threshold to default when new result is received
      setSimulatedThreshold(0.25);
      
      // If user is unauthenticated, save to localStorage for later persistence
      if (!user && r) {
        const unsavedApp: UnsavedApplication = {
          ...payload,
          pd: r.pd,
          risk_grade: r.risk_grade,
          decision: r.decision,
          timestamp: new Date().toISOString(),
        };
        addUnsavedApplication(unsavedApp);
      }
    } catch (err: any) {
      setError(err?.message || "Request failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const isAuthenticated = !!user;

  return (
    <main>
      <Navigation />
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Scoring Form</h2>
          {!isAuthenticated && (
            <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded">
              Try it free • No sign-up required
            </span>
          )}
        </div>
        <form className="grid gap-6 md:grid-cols-2" onSubmit={onSubmit}>
          {/* numeric fields */}
          <label className="block space-y-2">
            <span className="label flex items-center gap-3">
              Loan Amount 
              <InfoIcon explanation="The total amount of money the borrower is requesting for the loan." />
            </span>
            <input name="loan_amnt" type="number" className="input" defaultValue={10000} required />
          </label>
          <label className="block space-y-2">
            <span className="label flex items-center gap-3">
              Annual Income 
              <InfoIcon explanation="The borrower's total annual income from all sources before taxes." />
            </span>
            <input name="annual_inc" type="number" className="input" defaultValue={80000} required />
          </label>
          <label className="block space-y-2">
            <span className="label flex items-center gap-3">
              DTI 
              <InfoIcon explanation="Debt-to-Income ratio: Monthly debt payments divided by monthly income, expressed as a percentage." />
            </span>
            <input name="dti" type="number" step="0.01" className="input" defaultValue={12.5} required />
          </label>
          <label className="block space-y-2">
            <span className="label flex items-center gap-3">
              Employment Length (years) 
              <InfoIcon explanation="Number of years the borrower has been employed at their current job." />
            </span>
            <input name="emp_length" type="number" className="input" defaultValue={4} required />
          </label>
          <label className="block space-y-2">
            <span className="label flex items-center gap-3">
              Revolving Utilization 
              <InfoIcon explanation="Percentage of available revolving credit that is currently being used (credit card balances vs limits)." />
            </span>
            <input name="revol_util" type="number" step="0.1" className="input" defaultValue={35} required />
          </label>
          <label className="block space-y-2">
            <span className="label flex items-center gap-3">
              FICO 
              <InfoIcon explanation="FICO credit score ranging from 300-850, indicating creditworthiness based on credit history." />
            </span>
            <input name="fico" type="number" className="input" defaultValue={720} required />
          </label>

          {/* categorical fields */}
          <label className="block space-y-2">
            <span className="label flex items-center gap-3">
              Lender-Assigned Grade 
              <InfoIcon explanation="The initial loan grade assigned by the lender (A=best, G=worst). This is used as an input feature for the ML model to predict PD. The model will calculate its own risk grade from the predicted PD, which may differ." />
            </span>
            <select name="grade" className="input" defaultValue="B">
              {"ABCDEFG".split("").map((g) => <option key={g}>{g}</option>)}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="label flex items-center gap-3">
              Term 
              <InfoIcon explanation="The length of time over which the loan will be repaid (36 or 60 months)." />
            </span>
            <select name="term" className="input" defaultValue="36 months">
              <option>36 months</option><option>60 months</option>
            </select>
          </label>
          <label className="block md:col-span-2 space-y-2">
            <span className="label flex items-center gap-3">
              Purpose 
              <InfoIcon explanation="The intended use of the loan funds (e.g., debt consolidation, credit card, home improvement, etc.)." />
            </span>
            <select name="purpose" className="input" defaultValue="debt_consolidation">
              {purposeOptions.map((purpose) => (
                <option key={purpose} value={purpose}>
                  {formatPurposeLabel(purpose)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="label flex items-center gap-3">
              Home Ownership 
              <InfoIcon explanation="The borrower's housing status: RENT, MORTGAGE, OWN (no mortgage), or OTHER." />
            </span>
            <select name="home_ownership" className="input" defaultValue="RENT">
              <option>RENT</option><option>MORTGAGE</option><option>OWN</option><option>OTHER</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="label flex items-center gap-3">
              State 
              <InfoIcon explanation="The two-letter state code where the borrower resides (e.g., MA for Massachusetts)." />
            </span>
            <input name="state" className="input" defaultValue="MA" />
          </label>

          <div className="md:col-span-2 flex gap-3 pt-2">
            <button className="btn" type="submit" disabled={loading}>{loading ? "Scoring…" : "Score"}</button>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
        </form>

        {result && (
          <>
            {/* Official saved results */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Scoring Results</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="card">
                  <div className="text-white/60">Probability of Default (PD)</div>
                  <div className="text-2xl font-semibold">{(result.pd * 100).toFixed(2)}%</div>
                </div>
                <div className="card">
                  <div className="text-white/60">Risk Grade</div>
                  <div className="text-2xl font-semibold">{result.risk_grade}</div>
                  <div className="text-xs text-white/50 mt-1">Calculated from PD</div>
                </div>
                <div className="card">
                  <div className="text-white/60">Decision{isAuthenticated ? " (Saved)" : ""}</div>
                  <div className="text-2xl font-semibold capitalize">{result.decision}</div>
                  <div className="text-xs text-white/50 mt-1">Threshold: 25%</div>
                </div>
              </div>
              
              {/* Grade comparison */}
              {submittedGrade && submittedGrade !== result.risk_grade && (
                <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400">ℹ️</span>
                    <div className="text-sm text-white/80">
                      <p className="font-medium mb-1">Note: Grade Difference</p>
                      <p>
                        You selected <span className="font-semibold">Lender-Assigned Grade: {submittedGrade}</span> as input, 
                        but the model calculated <span className="font-semibold">Risk Grade: {result.risk_grade}</span> from 
                        the predicted PD ({(result.pd * 100).toFixed(2)}%). The input grade is used as a feature to help predict PD, 
                        while the risk grade is derived from the final PD value.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {submittedGrade && submittedGrade === result.risk_grade && (
                <div className="mt-4 p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <div className="text-sm text-white/80">
                      <p>
                        The calculated <span className="font-semibold">Risk Grade: {result.risk_grade}</span> matches 
                        your <span className="font-semibold">Lender-Assigned Grade: {submittedGrade}</span>.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Threshold simulation section */}
            <div className="mt-6 card">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">Adjust Threshold (Simulation)</h3>
                <InfoIcon explanation="Adjust the approval threshold to see how it would affect the decision. This is for simulation only and does not change the saved decision." />
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-white/70">
                      Approval Threshold: <span className="font-semibold text-white">{(simulatedThreshold * 100).toFixed(0)}%</span>
                    </label>
                    <span className="text-xs text-white/50">Range: 5% - 50%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.50"
                    step="0.01"
                    value={simulatedThreshold}
                    onChange={(e) => setSimulatedThreshold(parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-1">
                    <span>5%</span>
                    <span>50%</span>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 pt-4 border-t border-white/10">
                  <div>
                    <div className="text-white/60 text-sm mb-1">Simulated Decision</div>
                    <div className={`text-2xl font-semibold capitalize ${
                      result.pd < simulatedThreshold 
                        ? 'text-green-400' 
                        : 'text-yellow-400'
                    }`}>
                      {result.pd < simulatedThreshold ? "Approve" : "Review"}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/60 text-sm mb-1">PD vs Threshold</div>
                    <div className="text-lg font-semibold">
                      {(result.pd * 100).toFixed(2)}% <span className="text-white/50">vs</span> {(simulatedThreshold * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-white/50 mt-1">
                      {result.pd < simulatedThreshold 
                        ? "✓ Below threshold - would approve"
                        : "✗ Above threshold - would review"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sign-up prompt for unauthenticated users - placed last */}
            {!isAuthenticated && (
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">💾</div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">Save this result to your dashboard</h4>
                    <p className="text-sm text-white/80 mb-4">
                      This scoring result is not saved. Create a free account to save your applications, track your portfolio, and access detailed analytics.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link 
                        href="/auth?mode=signup" 
                        className="btn px-6 py-2 text-center"
                      >
                        Sign Up Free
                      </Link>
                      <Link 
                        href="/auth?mode=login" 
                        className="px-6 py-2 text-center text-white/80 hover:text-white border border-white/20 rounded-xl hover:border-white/40 transition-colors"
                      >
                        Already have an account? Sign In
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </main>
  );
}