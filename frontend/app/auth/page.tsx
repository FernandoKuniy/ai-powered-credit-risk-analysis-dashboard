"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import { LoginForm, SignUpForm } from "../components/AuthForms";

function AuthPageContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const [isLogin, setIsLogin] = useState(mode !== "signup");
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (mode === "signup") setIsLogin(false);
    else if (mode === "login") setIsLogin(true);
  }, [mode]);

  useEffect(() => {
    if (!loading && user) router.push("/dashboard");
  }, [user, loading, router]);

  if (loading) return <Centered>Loading…</Centered>;
  if (user) return null;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        {isLogin ? "Sign in" : "Create an account"}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {isLogin
          ? "To get back to the applications you have saved."
          : "So the applications you score are still here next time."}
      </p>

      {/* Two tabs sharing an underline rather than a pill-in-a-tray, which is the same
          pattern the section nav in the header uses. */}
      <div
        role="tablist"
        aria-label="Sign in or create an account"
        className="mt-8 flex gap-5 border-b border-zinc-200 dark:border-zinc-800"
      >
        <Tab selected={isLogin} onSelect={() => setIsLogin(true)}>
          Sign in
        </Tab>
        <Tab selected={!isLogin} onSelect={() => setIsLogin(false)}>
          Create an account
        </Tab>
      </div>

      <div className="mt-6">
        {isLogin ? <LoginForm /> : <SignUpForm onSwitchToLogin={() => setIsLogin(true)} />}
      </div>
    </main>
  );
}

function Tab({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={`-mb-px border-b-2 py-2.5 text-sm transition-colors ${
        selected
          ? "border-zinc-900 font-medium text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
          : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <p className="text-sm text-zinc-500">{children}</p>
    </main>
  );
}

export default function AuthPage() {
  // useSearchParams needs a Suspense boundary above it, or the whole route opts out of
  // static rendering.
  return (
    <Suspense fallback={<Centered>Loading…</Centered>}>
      <AuthPageContent />
    </Suspense>
  );
}
