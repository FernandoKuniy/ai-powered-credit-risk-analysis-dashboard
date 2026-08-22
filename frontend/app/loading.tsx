// The route-level loading state. Deliberately quiet: a spinner racing on a screen about
// somebody's credit is more alarming than the wait it is covering.
export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 items-center px-6 py-10">
      <p className="text-sm text-zinc-500">Loading…</p>
    </main>
  );
}
