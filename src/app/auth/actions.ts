"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type AuthState = {
  error?: string;
  success?: string;
  timestamp?: number;
} | undefined;

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Email is required.", timestamp: Date.now() };
  }

  const requestHeaders = headers();
  const host = requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || "http";
  const origin = `${protocol}://${host}`;

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/dashboard/reset-password`,
  });

  if (error) return { error: error.message, timestamp: Date.now() };

  return {
    success: "A password reset link has been sent to your email.",
    timestamp: Date.now(),
  };
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");

  if (!password || password.length < 6) {
    return {
      error: "Password must be at least 6 characters.",
      timestamp: Date.now(),
    };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message, timestamp: Date.now() };

  redirect("/dashboard?message=" + encodeURIComponent("Password updated successfully."));
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");


  // Query auth.users directly in the Supabase secure auth schema
  const existingAuthUsers = await prisma.$queryRaw<any[]>`
    SELECT id FROM auth.users WHERE LOWER(email) = ${email.toLowerCase()} LIMIT 1
  `;

  if (existingAuthUsers.length === 0) {
    return { error: "Account does not exist. Please sign up.", timestamp: Date.now() };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message, timestamp: Date.now() };
  redirect(next || "/dashboard");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();


  if (!name) {
    return { error: "Name is required.", timestamp: Date.now() };
  }

  // Query auth.users directly in the Supabase secure auth schema to check for confirmed users
  const existingAuthUsers = await prisma.$queryRaw<any[]>`
    SELECT id FROM auth.users WHERE LOWER(email) = ${email.toLowerCase()} AND email_confirmed_at IS NOT NULL LIMIT 1
  `;

  if (existingAuthUsers.length > 0) {
    return {
      error: "An account with this email already exists. Please sign in.",
      timestamp: Date.now(),
    };
  }

  const requestHeaders = headers();
  const host = requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || "http";
  const origin = `${protocol}://${host}`;

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) return { error: error.message, timestamp: Date.now() };

  // If email confirmation is enabled (no session exists yet), redirect to login with a success message
  if (!data?.session) {
    redirect(
      `/login?message=${encodeURIComponent(
        "A verification link has been sent to your email. Please check your inbox.",
      )}`,
    );
  }

  // If email confirmation is disabled (common in self-host), session is set.
  redirect("/dashboard");
}
