"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { updatePassword, type AuthState } from "@/app/auth/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      Update password
    </button>
  );
}

export function ResetPasswordForm() {
  const [state, formAction] = useFormState<AuthState, FormData>(
    updatePassword,
    undefined,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (state?.error) {
      setErrorMsg(state.error);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="new-password">
          New password
        </label>
        <div className="relative">
          <input
            id="new-password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            className="input pr-10"
            placeholder="••••••••"
            onChange={() => setErrorMsg(null)}
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

      {errorMsg && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
