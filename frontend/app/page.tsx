import Link from "next/link";


export default function HomePage() {
  return (
    <main className="grid gap-6 md:grid-cols-2">
      <div className="card">
        <h2 className="text-lg font-medium mb-2">Score an Application</h2>
        <p className="text-white/70 mb-4">Enter applicant info and get PD, grade, and decision instantly.</p>
        <Link className="btn" href="/score">Open Scoring Form</Link>
      </div>
      <div className="card">
        <h2 className="text-lg font-medium mb-2">Portfolio Dashboard</h2>
        <p className="text-white/70 mb-4">View risk distribution and simulate approval thresholds.</p>
        <Link className="btn" href="/dashboard">Open Dashboard</Link>
      </div>
    </main>
  );
}