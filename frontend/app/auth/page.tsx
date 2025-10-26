"use client";
import { useState } from 'react';
import { LoginForm, SignUpForm } from '../components/AuthForms';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

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
          {isLogin ? <LoginForm /> : <SignUpForm />}
        </div>
      </div>
    </main>
  );
}
