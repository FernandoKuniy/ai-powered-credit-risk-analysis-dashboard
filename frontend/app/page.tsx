"use client";
import Link from "next/link";
import { useAuth } from "../lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // Redirect authenticated users to dashboard
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </main>
    );
  }

  if (user) {
    return null; // Will redirect to dashboard
  }

  return (
    <main className="grid gap-6 md:grid-cols-2">
      <div className="card">
        <h2 className="text-lg font-medium mb-2">Score an Application</h2>
        <p className="text-white/70 mb-4">Enter applicant info and get PD, grade, and decision instantly.</p>
        <Link className="btn" href="/auth">Sign In to Score</Link>
      </div>
      <div className="card">
        <h2 className="text-lg font-medium mb-2">Portfolio Dashboard</h2>
        <p className="text-white/70 mb-4">View risk distribution and simulate approval thresholds.</p>
        <Link className="btn" href="/auth">Sign In to View Dashboard</Link>
      </div>
    </main>
  );
}