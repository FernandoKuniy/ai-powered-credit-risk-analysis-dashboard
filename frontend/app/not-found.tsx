import Link from "next/link";

// Shown for a URL that matches nothing. Same plain tone as the rest of the app rather than a
// bare 404.
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Nothing here</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        This page doesn&apos;t exist. If you followed a link to a saved application, it may have
        been deleted.
      </p>
      <p className="mt-6 text-sm text-zinc-500">
        <Link href="/score" className="underline underline-offset-2">
          Back to scoring
        </Link>
      </p>
    </main>
  );
}
