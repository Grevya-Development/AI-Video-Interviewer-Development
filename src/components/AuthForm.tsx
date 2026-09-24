"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { useState, useEffect } from "react";
import { signIn, signUp, requestPasswordReset, type AuthState } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/client";
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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setErrorMsg(null);
      const supabase = createClient();
      const origin = window.location.origin;
      const redirectPath = next
        ? `/auth/confirm?next=${encodeURIComponent(next)}`
        : "/auth/confirm";
      const redirectTo = `${origin}${redirectPath}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to initialize Google Sign In");
      setIsGoogleLoading(false);
    }
  };

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
    <div className="space-y-4">
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

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-all shadow-xs hover:shadow active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isGoogleLoading ? (
          <div className="h-5 w-5 border-2 border-slate-300 border-t-brand-600 rounded-full animate-spin" />
        ) : (
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>{mode === "login" ? "Sign in with Google" : "Sign up with Google"}</span>
      </button>

      <div className="relative my-3 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative bg-white px-3 text-xs uppercase tracking-wider text-slate-400 font-medium">
          or continue with email
        </div>
      </div>

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
    </div>
  );
}
