import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionCookieValue,
  hasAdminCredentialConfig,
  isAdminCredential,
} from "@/lib/admin-auth";
import { isZhRequest } from "@/lib/api-locale";
import { getClientFingerprint, evaluateRateLimit, getRetryAfterSeconds } from "@/lib/rate-limit";
import { logApiEvent, reportApiError } from "@/lib/observability";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const isZh = isZhRequest(request);

  try {
    if (!hasAdminCredentialConfig()) {
      await logApiEvent({
        level: "error",
        route: "/api/admin/login",
        event: "admin.login.config_missing",
        request,
        requestId,
        message: "Admin credentials are not configured safely.",
      });
      return NextResponse.json({ error: isZh ? "管理員登入功能尚未完成設定。" : "Admin login is not configured." }, { status: 503 });
    }

    const body = (await request.json()) as { email?: string; password?: string };
    const email = String(body.email ?? "");
    const password = String(body.password ?? "");

    const limiter = await evaluateRateLimit({
      namespace: "admin-login",
      key: `${getClientFingerprint(request)}:${email.trim().toLowerCase()}`,
      max: 8,
      windowMs: 60_000,
    });

    if (!limiter.allowed) {
      const retryAfter = getRetryAfterSeconds(limiter.resetAt);
      await logApiEvent({
        level: "warn",
        route: "/api/admin/login",
        event: "admin.login.rate_limited",
        request,
        requestId,
        message: "Admin login rate-limited.",
        context: {
          retryAfter,
          email: email.trim().toLowerCase(),
        },
      });
      return NextResponse.json(
        { error: isZh ? "登入嘗試次數過多，請稍後再試。" : "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "retry-after": String(retryAfter),
          },
        },
      );
    }

    const forwardedProto = request.headers.get("x-forwarded-proto") ?? "";
    const isHttps = new URL(request.url).protocol === "https:" || forwardedProto.toLowerCase() === "https";

    if (!isAdminCredential(email, password)) {
      await logApiEvent({
        level: "warn",
        route: "/api/admin/login",
        event: "admin.login.invalid_credentials",
        request,
        requestId,
        message: "Invalid admin credentials.",
        context: {
          email: email.trim().toLowerCase(),
        },
      });
      return NextResponse.json({ error: isZh ? "管理員帳號或密碼不正確。" : "Invalid admin credentials." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, getAdminSessionCookieValue(), {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    await logApiEvent({
      level: "info",
      route: "/api/admin/login",
      event: "admin.login.success",
      request,
      requestId,
      message: "Admin login succeeded.",
      context: {
        email: email.trim().toLowerCase(),
      },
    });

    return response;
  } catch (error) {
    await reportApiError({
      route: "/api/admin/login",
      request,
      requestId,
      error,
    });
    return NextResponse.json({ error: isZh ? "管理員登入時發生未預期錯誤，請稍後再試。" : "Unexpected error while logging in." }, { status: 500 });
  }
}
