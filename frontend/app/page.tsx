"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../lib/auth";
import { NARROW } from "../lib/layout";
import { DEFAULT_THRESHOLD } from "../lib/policy";

/**
 * The way in, for someone who is not signed in.
 *
 * This used to be a landing page: a gradient hero, three feature cards with emoji, a
 * four-step how-to, a checkmark grid and a closing call to action, most of it describing the
 * product in words that would fit any product. It is a dashboard's front door, so it now
 * carries what the model actually does and the two ways in, and nothing else. Both
 * destinations and the redirect-when-signed-in behaviour are unchanged.
 */
export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className={`${NARROW} flex-1 py-16`}>
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  // The redirect above is already running; rendering the signed-out pitch underneath it would
  // flash content nobody in this state should see.
  if (user) return null;

  return (
    <main className={`${NARROW} flex-1 py-16`}>
      <h1 className="max-w-2xl text-3xl font-semibold tracking-tight">
        What are the odds this borrower defaults?
      </h1>
      <p className="mt-3 max-w-prose text-zinc-600 dark:text-zinc-400">
        Enter eleven facts about a loan application. A gradient-boosted model trained on
        historical LendingClub loans returns the probability of default, the risk grade that
        probability falls into, and a ranked breakdown of which of the eleven pushed the number
        and by how much.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link href="/score" className="btn">
          Score an application
        </Link>
        <Link href="/auth?mode=signup" className="btn-secondary">
          Create an account
        </Link>
      </div>
      <p className="mt-3 text-sm text-zinc-500">
        Scoring needs no account. One is only needed to keep results.
      </p>

      <dl className="mt-12 space-y-6 border-t border-zinc-100 pt-8 dark:border-zinc-800">
        <div>
          <dt className="text-sm font-medium">Without an account</dt>
          <dd className="mt-1 max-w-prose text-sm text-zinc-600 dark:text-zinc-400">
            You get the probability, the grade, the approve-or-review call at the{" "}
            {Math.round(DEFAULT_THRESHOLD * 100)}% cut-off, and the factor breakdown. The result
            stays in this browser and is gone when you clear it.
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium">With one</dt>
          <dd className="mt-1 max-w-prose text-sm text-zinc-600 dark:text-zinc-400">
            Scored applications are kept, so you can see how they spread across the grades and
            drag the approval cut-off across all of them at once to see what it would cost.
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium">What it will not do</dt>
          <dd className="mt-1 max-w-prose text-sm text-zinc-600 dark:text-zinc-400">
            Decide anything. The model only knows the kinds of borrowers in the dataset it was
            trained on, and a probability is not an underwriting decision.
          </dd>
        </div>
      </dl>
    </main>
  );
}
