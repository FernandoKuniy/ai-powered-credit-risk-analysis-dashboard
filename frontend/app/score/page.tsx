"use client";
import Link from "next/link";
import { useState } from "react";
import {
  addUnsavedApplication,
  scoreApplication,
  type ScorePayload,
  type ScoreResponse,
  type UnsavedApplication,
} from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { NARROW } from "../../lib/layout";
import ExplanationDisplay from "../components/ExplanationDisplay";
import ScoreForm from "../components/ScoreForm";
import ScoreResult from "../components/ScoreResult";
import ThresholdSimulator from "../components/ThresholdSimulator";

export default function ScorePage() {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ScoreResponse | null>(null);
  // The grade that was typed in, kept so the result can point out where the model disagreed.
  // It is deliberately captured at submit time rather than read back off the form, which the
  // person may have edited since.
  const [submittedGrade, setSubmittedGrade] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { session, user } = useAuth();

  async function handleSubmit(payload: ScorePayload) {
    setSubmitting(true);
    setError(null);
    setSubmittedGrade(payload.grade);
    try {
      const scored = await scoreApplication(payload, session?.access_token);
      setResult(scored);

      // Signed out, nothing is persisted server-side, so the result is parked in
      // localStorage and picked up if the person creates an account afterwards.
      if (!user) {
        const unsaved: UnsavedApplication = {
          ...payload,
          pd: scored.pd,
          risk_grade: scored.risk_grade,
          decision: scored.decision,
          explanation: scored.explanation,
          timestamp: new Date().toISOString(),
        };
        addUnsavedApplication(unsaved);
      }
    } catch (err) {
      setResult(null);
      // Guard the empty case explicitly: an Error with a blank message is falsy once it
      // reaches the JSX below, which silently swallowed the whole failure.
      const message = err instanceof Error ? err.message.trim() : "";
      setError(message || "The scoring service didn't respond.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={`${NARROW} flex-1 py-10`}>
      <h1 className="text-2xl font-semibold tracking-tight">Score an application</h1>
      <p className="mt-2 max-w-prose text-sm text-zinc-600 dark:text-zinc-400">
        Eleven facts about a borrower go in. What comes back is the probability they default, the
        grade that probability maps to, and which of those eleven pushed the number hardest.
      </p>

      <div className="mt-8 space-y-6">
        <section className="card">
          <ScoreForm onSubmit={handleSubmit} submitting={submitting} />
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 p-5 dark:border-red-900/60"
          >
            <h2 className="text-sm font-medium text-red-700 dark:text-red-400">
              That didn&apos;t score
            </h2>
            {/* The model service returns its own message; break-words keeps a long one from
                widening the card past the page. */}
            <p className="mt-1 break-words text-sm text-zinc-600 dark:text-zinc-400">{error}</p>
          </div>
        )}

        {result && (
          <>
            <ScoreResult
              pd={result.pd}
              riskGrade={result.risk_grade}
              decision={result.decision}
              submittedGrade={submittedGrade}
            />
            <ThresholdSimulator pd={result.pd} />
            <ExplanationDisplay explanation={result.explanation} />
            {!user && <SaveNudge />}
          </>
        )}
      </div>
    </main>
  );
}

/** Signed out, this result is only in this browser. Said plainly, once, under the result. */
function SaveNudge() {
  return (
    <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="text-sm font-medium">This one isn&apos;t saved</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        It is sitting in this browser only. An account keeps your scored applications together so
        you can compare them and run a cut-off across the whole set at once.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href="/auth?mode=signup" className="btn">
          Create an account
        </Link>
        <Link href="/auth?mode=login" className="btn-secondary">
          Sign in
        </Link>
      </div>
    </div>
  );
}
