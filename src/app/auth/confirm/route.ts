import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getRedirectResponse(next: string, request: NextRequest) {
  const nextUrl = new URL(next, request.url);
  if (nextUrl.pathname === "/dashboard") {
    nextUrl.searchParams.set("verified", "true");
  }
  return NextResponse.redirect(nextUrl);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = createClient();

  // 1. If we have a PKCE authorization code, exchange it for a session cookie
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return getRedirectResponse(next, request);
    }
    console.error("exchangeCodeForSession error:", error);
  }

  // 2. If we have a token_hash and type (from direct OTP link), verify it
  if (token_hash && type) {
    // Check if the user is already authenticated
    const { data: { user: existingUser } } = await supabase.auth.getUser();
    if (existingUser) {
      return getRedirectResponse(next, request);
    }

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      return getRedirectResponse(next, request);
    }
    console.error("verifyOtp error:", error);

    // Check again in case verifyOtp set the session but returned a transient error
    const { data: { user: confirmedUser } } = await supabase.auth.getUser();
    if (confirmedUser) {
      return getRedirectResponse(next, request);
    }
  }

  // 3. Fallback: If they already have an active session, let them proceed
  const { data: { user: finalUser } } = await supabase.auth.getUser();
  if (finalUser) {
    return getRedirectResponse(next, request);
  }

  // Redirect to login page with an error parameter if verification fails
  return NextResponse.redirect(
    new URL("/login?error=Verification failed", request.url),
  );
}
