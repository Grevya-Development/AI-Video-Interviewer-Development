import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();

  // If called via fetch/client navigation, return ok response so client handles route directly
  const accept = request.headers.get("accept") || "";
  if (accept.includes("application/json") || request.headers.get("sec-fetch-mode") === "cors") {
    return NextResponse.json({ success: true });
  }

  // Fallback for direct browser form POST: redirect to /login preserving forwarded host
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const url = new URL("/login", request.url);
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0].trim();
    if (host.includes(":")) {
      url.host = host;
    } else {
      url.hostname = host;
      url.port = "";
    }
    url.protocol = forwardedProto.endsWith(":") ? forwardedProto : `${forwardedProto}:`;
  }
  return NextResponse.redirect(url, { status: 303 });
}

export async function GET(request: Request) {
  return POST(request);
}
