import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function sanitizeNextPath(raw: string | null, fallback = "/dashboard") {
  if (!raw) {
    return fallback;
  }

  // Allow only same-site absolute paths and reject protocol-relative or absolute URLs.
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }

  return raw;
}

function getPublicOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? request.headers.get("host");

  if (host) {
    const protocol = forwardedProto ?? "https";
    return `${protocol}://${host}`;
  }

  return new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const origin = getPublicOrigin(request);

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase?.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, origin));
}
