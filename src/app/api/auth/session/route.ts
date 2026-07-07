import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseConfig } from "@/lib/supabase/env";
import { getClientFingerprint, evaluateRateLimit, getRetryAfterSeconds } from "@/lib/rate-limit";
import { logApiEvent, reportApiError } from "@/lib/observability";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const limiter = evaluateRateLimit({
      namespace: "auth-session",
      key: getClientFingerprint(request),
      max: 30,
      windowMs: 60_000,
    });

    if (!limiter.allowed) {
      const retryAfter = getRetryAfterSeconds(limiter.resetAt);
      await logApiEvent({
        level: "warn",
        route: "/api/auth/session",
        event: "auth.session.rate_limited",
        request,
        requestId,
        message: "Session endpoint rate-limited.",
        context: { retryAfter },
      });

      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "retry-after": String(retryAfter),
          },
        },
      );
    }

    const body = (await request.json()) as { access_token?: string; refresh_token?: string };
    const accessToken = String(body.access_token ?? "");
    const refreshToken = String(body.refresh_token ?? "");
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? "";
    const isHttps = new URL(request.url).protocol === "https:" || forwardedProto.toLowerCase() === "https";

    if (!accessToken || !refreshToken) {
      await logApiEvent({
        level: "warn",
        route: "/api/auth/session",
        event: "auth.session.invalid_payload",
        request,
        requestId,
        message: "Missing session tokens.",
      });
      return NextResponse.json({ error: "Missing session tokens." }, { status: 400 });
    }

    if (!hasSupabaseConfig()) {
      await logApiEvent({
        level: "error",
        route: "/api/auth/session",
        event: "auth.session.supabase_missing",
        request,
        requestId,
        message: "Supabase is not configured.",
      });
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true });
    const supabase = createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
      cookies: {
        getAll() {
          return [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              secure: isHttps || options.secure,
            });
          });
        },
      },
    });

    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      await logApiEvent({
        level: "warn",
        route: "/api/auth/session",
        event: "auth.session.set_failed",
        request,
        requestId,
        message: error.message,
      });
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    await logApiEvent({
      level: "info",
      route: "/api/auth/session",
      event: "auth.session.set_success",
      request,
      requestId,
    });

    return response;
  } catch (error) {
    await reportApiError({
      route: "/api/auth/session",
      request,
      requestId,
      error,
    });

    return NextResponse.json({ error: "Unexpected error while setting session." }, { status: 500 });
  }
}