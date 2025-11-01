"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoginForm, SignUpForm } from '../components/AuthForms';
import { useAuth } from '../../lib/auth';
import { useRouter } from 'next/navigation';

function AuthPageContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const [isLogin, setIsLogin] = useState(mode !== 'signup');
  const { user, loading } = useAuth();
  const router = useRouter();

  // Update state if mode changes in URL
  useEffect(() => {
    if (mode === 'signup') {
      setIsLogin(false);
    } else if (mode === 'login') {
      setIsLogin(true);
    }
  }, [mode]);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Show loading while checking auth state
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </main>
    );
  }

  // Don't render auth forms if user is already authenticated
  if (user) {
    return null; // Will redirect to dashboard
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full">
        <div className="card">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">Credit Risk Analytics</h1>
            <p className="text-white/70">Sign in to access the platform</p>
          </div>

          {/* Toggle between login and signup */}
          <div className="flex mb-6 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                isLogin
                  ? 'bg-blue-600 text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                !isLogin
                  ? 'bg-blue-600 text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Auth forms */}
          {isLogin ? <LoginForm /> : <SignUpForm onSwitchToLogin={() => setIsLogin(true)} />}
        </div>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </main>
    }>
      <AuthPageContent />
    </Suspense>
  );
}
