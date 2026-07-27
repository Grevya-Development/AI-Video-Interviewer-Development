"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { useState, useEffect } from "react";
import { signIn, signUp, requestPasswordReset, type AuthState } from "@/app/auth/actions";
import { Eye, EyeOff } from "lucide-react";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Please wait…" : label}
    </button>
  );
}

export function AuthForm({
  mode,
  next,
  error,
  message,
}: {
  mode: "login" | "signup";
  next?: string;
  error?: string;
  message?: string;
}) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction] = useFormState<AuthState, FormData>(
    action,
    undefined,
  );
  const [resetState, resetFormAction] = useFormState<AuthState, FormData>(
    requestPasswordReset,
    undefined,
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [canClear, setCanClear] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Sync error/message prop to local state and clear URL parameters
  useEffect(() => {
    if (error || message) {
      if (error) setErrorMsg(error);
      if (message) setSuccessMsg(message);

      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      url.searchParams.delete("message");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [error, message]);

  // Sync formState error to local state
  useEffect(() => {
    if (state?.error) {
      setErrorMsg(state.error);
    }
  }, [state]);

  // Sync resetState success/error to local state
  useEffect(() => {
    if (resetState?.error) {
      setErrorMsg(resetState.error);
      setSuccessMsg(null);
    } else if (resetState?.success) {
      setSuccessMsg(resetState.success);
      setErrorMsg(null);
    }
  }, [resetState]);

  // Allow clearing of message notifications only after a 3-second delay from mount (ignores immediate autofills)
  useEffect(() => {
    const timer = setTimeout(() => {
      setCanClear(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = () => {
    if (canClear) {
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  };

  const toggleForgotPassword = (val: boolean) => {
    setIsForgotPassword(val);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  if (isForgotPassword) {
    return (
      <form action={resetFormAction} className="space-y-4">
        <div>
          <label className="label" htmlFor="reset-email">
            Work email
          </label>
          <input
            id="reset-email"
            name="email"
            type="email"
            required
            className="input"
            placeholder="you@company.com"
            onKeyDown={handleInputChange}
            onPaste={handleInputChange}
          />
        </div>

        {successMsg && (
          <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
            {successMsg}
          </p>
        )}

        {errorMsg && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMsg}
          </p>
        )}

        <SubmitButton label="Send reset link" />

        <p className="text-center text-sm text-slate-500">
          <button
            type="button"
            onClick={() => toggleForgotPassword(false)}
            className="text-brand-600 hover:underline"
          >
            Back to sign in
          </button>
        </p>
      </form>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            className="input"
            placeholder="Alex HR"
            onKeyDown={handleInputChange}
            onPaste={handleInputChange}
          />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="input"
          placeholder="you@company.com"
          onKeyDown={handleInputChange}
          onPaste={handleInputChange}
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="label mb-0" htmlFor="password">
            Password
          </label>
          {mode === "login" && (
            <button
              type="button"
              onClick={() => toggleForgotPassword(true)}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              Forgot password?
            </button>
          )}
        </div>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            className="input pr-10"
            placeholder="••••••••"
            onKeyDown={handleInputChange}
            onPaste={handleInputChange}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      <input type="hidden" name="next" value={next ?? "/dashboard"} />

      {successMsg && (
        <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
          {successMsg}
        </p>
      )}

      {errorMsg && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      <SubmitButton label={mode === "login" ? "Sign in" : "Create account"} />

      <p className="text-center text-sm text-slate-500">
        {mode === "login" ? (
          <>
            No account?{" "}
            <Link href="/signup" className="text-brand-600 hover:underline">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-brand-600 hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
