"use client";

// Catches an unhandled error anywhere in the app so a bad response from the model service
// never drops somebody onto a stack trace. Client component by requirement: it holds `reset`.

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // No error tracker is wired up, so at least put it in the console for whoever is looking.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">That didn&apos;t load right</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Something broke on our side, not in anything you entered. Nothing you had already saved
        is affected.
      </p>
      <button onClick={reset} className="btn mt-6">
        Try again
      </button>
      <p className="mt-6 text-sm text-zinc-500">
        <Link href="/score" className="underline underline-offset-2">
          Back to scoring
        </Link>
      </p>
    </main>
  );
}
