"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import { WIDE } from "../../lib/layout";
import { DEFAULT_THRESHOLD } from "../../lib/policy";
import {
  deleteApplication,
  getApplication,
  getPortfolio,
  simulatePortfolio,
  type ApplicationDetail as Application,
  type PortfolioData,
  type SimulationData,
} from "../../lib/portfolio";
import ApplicationDetail from "../components/ApplicationDetail";
import ApplicationsTable from "../components/ApplicationsTable";
import ApprovalCurveChart from "../components/ApprovalCurveChart";
import GradeDistributionChart from "../components/GradeDistributionChart";
import PolicySimulator from "../components/PolicySimulator";
import PortfolioSummary from "../components/PortfolioSummary";

export default function DashboardPage() {
  const { session, user, loading: authLoading } = useAuth();
  const accessToken = session?.access_token;

  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [simulation, setSimulation] = useState<SimulationData | null>(null);
  const [simulating, setSimulating] = useState(false);

  const [selected, setSelected] = useState<Application | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPortfolio = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      setPortfolio(await getPortfolio(accessToken));
    } catch (err) {
      const message = err instanceof Error ? err.message.trim() : "";
      setError(message || "Couldn't reach your portfolio.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      loadPortfolio();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [accessToken, authLoading, loadPortfolio]);

  // The simulate endpoint is the only source for the expected default rate among approved
  // applications, so this refetches as the slider moves. The abort flag stops a slow earlier
  // response from overwriting a newer one when someone drags the slider quickly.
  useEffect(() => {
    if (!portfolio || portfolio.total_applications === 0) return;
    let stale = false;
    setSimulating(true);
    simulatePortfolio(threshold, accessToken)
      .then((data) => {
        if (!stale) setSimulation(data);
      })
      .catch(() => {
        if (!stale) setSimulation(null);
      })
      .finally(() => {
        if (!stale) setSimulating(false);
      });
    return () => {
      stale = true;
    };
  }, [threshold, portfolio, accessToken]);

  async function openApplication(id: string) {
    if (!accessToken) return;
    setDetailOpen(true);
    setSelected(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      setSelected(await getApplication(id, accessToken));
    } catch (err) {
      const message = err instanceof Error ? err.message.trim() : "";
      setDetailError(message || "Couldn't load this application.");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeApplication() {
    setDetailOpen(false);
    setSelected(null);
    setDetailError(null);
  }

  async function handleDelete() {
    if (!selected || !accessToken) return;
    if (!window.confirm("Delete this application? This can't be undone.")) return;

    setDeleting(true);
    setDetailError(null);
    try {
      await deleteApplication(selected.id, accessToken);
      closeApplication();
      await loadPortfolio();
    } catch (err) {
      const message = err instanceof Error ? err.message.trim() : "";
      // Reported inside the panel rather than through window.alert, so the person can see
      // which application it refers to while they read it.
      setDetailError(message || "Couldn't delete this application.");
    } finally {
      setDeleting(false);
    }
  }

  if (authLoading || (accessToken && loading)) {
    return <Shell>Loading your portfolio…</Shell>;
  }

  if (!user) {
    return (
      <main className={`${WIDE} flex-1 py-10`}>
        <h1 className="text-2xl font-semibold tracking-tight">Your portfolio</h1>
        <p className="mt-2 max-w-prose text-sm text-zinc-600 dark:text-zinc-400">
          Scored applications are saved to an account. Once there are a few, this page shows how
          they spread across the grades and what a different cut-off would do to the whole set.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/auth?mode=signup" className="btn">
            Create an account
          </Link>
          <Link href="/auth?mode=login" className="btn-secondary">
            Sign in
          </Link>
        </div>
        <p className="mt-6 text-sm text-zinc-500">
          Or{" "}
          <Link href="/score" className="underline underline-offset-2">
            score one without an account
          </Link>{" "}
          first.
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className={`${WIDE} flex-1 py-10`}>
        <h1 className="text-2xl font-semibold tracking-tight">Your portfolio</h1>
        <div role="alert" className="mt-6 rounded-xl border border-red-200 p-5 dark:border-red-900/60">
          <h2 className="text-sm font-medium text-red-700 dark:text-red-400">
            That didn&apos;t load
          </h2>
          <p className="mt-1 break-words text-sm text-zinc-600 dark:text-zinc-400">{error}</p>
          <button type="button" onClick={loadPortfolio} className="btn mt-4">
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!portfolio) {
    return <Shell>Loading your portfolio…</Shell>;
  }

  if (portfolio.total_applications === 0) {
    return (
      <main className={`${WIDE} flex-1 py-10`}>
        <h1 className="text-2xl font-semibold tracking-tight">Your portfolio</h1>
        <p className="empty mt-6">
          Nothing scored yet.{" "}
          <Link href="/score" className="underline underline-offset-2">
            Score your first application
          </Link>
          .
        </p>
      </main>
    );
  }

  const pds = portfolio.recent_applications.map((application) => application.pd);

  return (
    <main className={`${WIDE} flex-1 py-10`}>
      <h1 className="text-2xl font-semibold tracking-tight">Your portfolio</h1>
      <p className="mt-2 max-w-prose text-sm text-zinc-600 dark:text-zinc-400">
        Every application you have scored and saved, and what moving the approval line would do
        to all of them at once.
      </p>

      <div className="mt-8 space-y-6">
        <PortfolioSummary portfolio={portfolio} />

        <div className="grid gap-6 lg:grid-cols-2">
          <GradeDistributionChart distribution={portfolio.grade_distribution} />
          <ApprovalCurveChart pds={pds} threshold={threshold} />
        </div>

        <PolicySimulator
          threshold={threshold}
          onThresholdChange={setThreshold}
          simulation={simulation}
          pending={simulating}
        />

        <ApplicationsTable
          applications={portfolio.recent_applications}
          onSelect={openApplication}
        />
      </div>

      {detailOpen && (
        <ApplicationDetail
          application={selected}
          loading={detailLoading}
          error={detailError}
          deleting={deleting}
          onClose={closeApplication}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className={`${WIDE} flex-1 py-10`}>
      <h1 className="text-2xl font-semibold tracking-tight">Your portfolio</h1>
      <p className="mt-6 text-sm text-zinc-500">{children}</p>
    </main>
  );
}
