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
    <main className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          AI-Powered Credit Risk Analysis
        </h1>
        <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
          Instantly assess loan applications with machine learning. Get probability of default, risk grades, and actionable insights to make informed lending decisions.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            href="/score" 
            className="btn text-lg px-8 py-3 bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Try Scoring Application for Free
          </Link>
          <Link 
            href="/auth" 
            className="px-8 py-3 text-white/80 hover:text-white border border-white/20 rounded-xl hover:border-white/40 transition-colors"
          >
            Sign Up for Full Access
          </Link>
        </div>
      </section>

      {/* What It Does Section */}
      <section className="card">
        <h2 className="text-2xl font-semibold mb-6">What This Application Does</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-lg font-semibold mb-2">Real-Time Scoring</h3>
            <p className="text-white/70 text-sm">
              Submit loan application details and receive instant risk assessment. Our XGBoost model analyzes applicant data to predict probability of default (PD) in real-time.
            </p>
          </div>
          <div>
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold mb-2">Risk Grading</h3>
            <p className="text-white/70 text-sm">
              Each application receives an automated risk grade (A-G) based on predicted PD, helping you quickly categorize and prioritize loan decisions.
            </p>
          </div>
          <div>
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="text-lg font-semibold mb-2">Decision Support</h3>
            <p className="text-white/70 text-sm">
              Get clear approve/review recommendations based on configurable risk thresholds, enabling consistent and data-driven lending policies.
            </p>
          </div>
        </div>
      </section>

      {/* How to Use Section */}
      <section className="card">
        <h2 className="text-2xl font-semibold mb-6">How to Use It</h2>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-semibold">1</div>
            <div>
              <h3 className="font-semibold mb-1">Try It Free (No Sign-Up Required)</h3>
              <p className="text-white/70 text-sm">
                Click "Try Scoring Application for Free" to access the scoring form. Enter loan details including amount, income, DTI ratio, FICO score, employment length, and other applicant information.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-semibold">2</div>
            <div>
              <h3 className="font-semibold mb-1">Get Instant Results</h3>
              <p className="text-white/70 text-sm">
                Receive immediate predictions: Probability of Default (PD) percentage, Risk Grade (A-G), and Decision recommendation (Approve/Review). You can also simulate different approval thresholds to see how they affect decisions.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-semibold">3</div>
            <div>
              <h3 className="font-semibold mb-1">Sign Up to Save & Track</h3>
              <p className="text-white/70 text-sm">
                After scoring your first application, you'll be prompted to create a free account. Once signed up, all your scored applications are saved to your personal dashboard where you can view portfolio analytics, track trends, and manage your loan pipeline.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-semibold">4</div>
            <div>
              <h3 className="font-semibold mb-1">Explore Portfolio Analytics</h3>
              <p className="text-white/70 text-sm">
                Access your dashboard to view aggregate metrics (total applications, average PD, approval rates), risk grade distributions, and use the policy simulator to test different approval thresholds on your portfolio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="card">
        <h2 className="text-2xl font-semibold mb-6">Key Features</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <span className="text-green-400 text-xl">✓</span>
            <div>
              <h4 className="font-semibold mb-1">Machine Learning Model</h4>
              <p className="text-white/70 text-sm">XGBoost classifier trained on LendingClub data for accurate default prediction.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-400 text-xl">✓</span>
            <div>
              <h4 className="font-semibold mb-1">Portfolio Analytics</h4>
              <p className="text-white/70 text-sm">Track portfolio-wide metrics including default rates, approval rates, and risk distributions.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-400 text-xl">✓</span>
            <div>
              <h4 className="font-semibold mb-1">Policy Simulation</h4>
              <p className="text-white/70 text-sm">Test different approval thresholds to understand impact on approval rates and expected defaults.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-green-400 text-xl">✓</span>
            <div>
              <h4 className="font-semibold mb-1">Real-Time Results</h4>
              <p className="text-white/70 text-sm">Get instant risk assessments without waiting for manual underwriting processes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="card text-center py-8 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30">
        <h2 className="text-2xl font-semibold mb-4">Ready to Get Started?</h2>
        <p className="text-white/80 mb-6 max-w-xl mx-auto">
          Try scoring an application for free right now. No credit card required. Sign up after to save your results and access the full dashboard.
        </p>
        <Link 
          href="/score" 
          className="btn text-lg px-8 py-3 bg-blue-600 hover:bg-blue-700 transition-colors inline-block"
        >
          Start Scoring Applications Now
        </Link>
      </section>
    </main>
  );
}