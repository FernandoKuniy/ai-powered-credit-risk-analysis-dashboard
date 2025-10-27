"use client";
import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Successful sign-in - redirect to dashboard
      router.push('/dashboard');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
          required
        />
      </div>
      {error && (
        <div className="text-red-400 text-sm">{error}</div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="btn w-full"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}

export function SignUpForm({ onSwitchToLogin }: { onSwitchToLogin?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showSwitchToLogin, setShowSwitchToLogin] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShowSwitchToLogin(false);

    const { error } = await signUp(email, password, fullName);
    
    if (error) {
      setError(error.message);
      
      // Show option to switch to login if it's a duplicate email
      if (error.code === 'DUPLICATE_EMAIL') {
        setShowSwitchToLogin(true);
      }
    } else {
      setSuccess(true);
    }
    
    setLoading(false);
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="text-green-400 mb-4">✓ Account created successfully!</div>
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
          <p className="text-white/90 font-medium mb-2">📧 Check your email</p>
          <p className="text-white/70 text-sm">
            We've sent a confirmation link to <strong>{email}</strong>
          </p>
          <p className="text-white/70 text-sm mt-2">
            Click the link in your email to activate your account and start using the platform.
          </p>
        </div>
        <p className="text-white/60 text-xs">
          Didn't receive the email? Check your spam folder or try signing up again.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Full Name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="input"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
          required
          minLength={6}
        />
      </div>
      {error && (
        <div className="text-red-400 text-sm">{error}</div>
      )}
      
      {showSwitchToLogin && onSwitchToLogin && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4">
          <p className="text-white/90 text-sm mb-2">Already have an account?</p>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-blue-400 hover:text-blue-300 text-sm underline"
          >
            Sign in instead
          </button>
        </div>
      )}
      
      <button
        type="submit"
        disabled={loading}
        className="btn w-full"
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  );
}
