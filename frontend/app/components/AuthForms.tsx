"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../../lib/auth";
import Field, { fieldProps } from "./Field";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      // Supabase phrases a wrong password and an unknown address identically on purpose, so
      // this stays vague too rather than confirming whether an account exists.
      setError(signInError.message || "That email and password didn't match.");
      setSubmitting(false);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field id="login-email" label="Email">
        <input
          {...fieldProps("login-email")}
          type="email"
          className="input"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </Field>
      <Field id="login-password" label="Password">
        <input
          {...fieldProps("login-password")}
          type="password"
          className="input"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </Field>
      {error && <FormError>{error}</FormError>}
      <button type="submit" className="btn w-full" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function SignUpForm({ onSwitchToLogin }: { onSwitchToLogin?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { signUp } = useAuth();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setErrorCode(null);

    const { error: signUpError } = await signUp(email, password, fullName);
    if (signUpError) {
      setError(signUpError.message || "That didn't go through.");
      setErrorCode(signUpError.code ?? null);
    } else {
      setSubmitted(true);
    }
    setSubmitting(false);
  }

  // Whether the account is new or already existed, the next step is the same and the copy
  // says the same thing. Spelling out which one it was would tell anyone with an email
  // address whether it is registered here.
  if (submitted) {
    return (
      <div>
        <h2 className="text-sm font-medium">Check your email</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          If that address can be used, there is now a confirmation link in it for{" "}
          <span className="break-all font-medium">{email}</span>. The account works once you
          follow it.
        </p>
        <p className="mt-4 text-sm text-zinc-500">
          Nothing arrived? Check spam, then{" "}
          {onSwitchToLogin ? (
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              try signing in
            </button>
          ) : (
            "try signing in"
          )}
          .
        </p>
      </div>
    );
  }

  const suggestSignIn = errorCode === "DUPLICATE_EMAIL" || errorCode === "CHECK_EMAIL_OR_SIGNIN";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field id="signup-name" label="Full name">
        <input
          {...fieldProps("signup-name")}
          type="text"
          className="input"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
        />
      </Field>
      <Field id="signup-email" label="Email">
        <input
          {...fieldProps("signup-email")}
          type="email"
          className="input"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </Field>
      <Field id="signup-password" label="Password" help="At least six characters.">
        <input
          {...fieldProps("signup-password")}
          type="password"
          className="input"
          autoComplete="new-password"
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </Field>
      {error && (
        <FormError>
          {error}
          {suggestSignIn && onSwitchToLogin && (
            <>
              {" "}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="underline underline-offset-2"
              >
                Sign in instead
              </button>
              .
            </>
          )}
        </FormError>
      )}
      <button type="submit" className="btn w-full" disabled={submitting}>
        {submitting ? "Creating your account…" : "Create account"}
      </button>
    </form>
  );
}

function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
      {children}
    </p>
  );
}
