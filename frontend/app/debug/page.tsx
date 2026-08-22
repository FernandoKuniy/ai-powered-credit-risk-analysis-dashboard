"use client";
import { useAuth } from "../../lib/auth";
import { NARROW } from "../../lib/layout";

/**
 * Auth state, for working out why a session is not what you expected.
 *
 * Deliberately plain. It is a development tool, and dressing it up would be polish spent
 * where nobody is looking.
 */
export default function AuthDebug() {
  // Called unconditionally. It used to sit below the dev-mode early return, which is a
  // conditional hook call: in production the component returned before useAuth ran, and any
  // later edit that made the branch flip between renders would have broken the hook order.
  const { user, session, loading } = useAuth();

  const isDevMode =
    process.env.NEXT_PUBLIC_DEV_MODE === "true" || process.env.NODE_ENV === "development";

  if (!isDevMode) {
    return (
      <main className={`${NARROW} flex-1 py-10`}>
        <h1 className="text-2xl font-semibold tracking-tight">Debug</h1>
        <p className="empty mt-6">Only available in development.</p>
      </main>
    );
  }

  return (
    <main className={`${NARROW} flex-1 py-10`}>
      <h1 className="text-2xl font-semibold tracking-tight">Auth debug</h1>
      <dl className="mt-6 divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 text-sm dark:divide-zinc-800 dark:border-zinc-800">
        <Row label="Loading" value={String(loading)} />
        <Row label="Session" value={session ? "present" : "none"} />
        <Row label="Access token" value={session?.access_token ? "present" : "none"} />
        <Row label="User" value={user ? "present" : "none"} />
        <Row label="User ID" value={user?.id ?? "none"} />
        <Row label="Email" value={user?.email ?? "none"} />
        <Row label="Role" value={user?.profile?.role ?? "none"} />
      </dl>
      <p className="mt-3 text-xs text-zinc-500">
        Token values are never printed here, only whether one is set.
      </p>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="text-zinc-500">{label}</dt>
      {/* Ids are long and have no natural break, so this wraps rather than pushing the row
          wider than the card. */}
      <dd className="min-w-0 break-all text-right font-medium">{value}</dd>
    </div>
  );
}
