import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionCookieValue,
  isAdminCredential,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = String(body.email ?? "");
  const password = String(body.password ?? "");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "";
  const isHttps = new URL(request.url).protocol === "https:" || forwardedProto.toLowerCase() === "https";

  if (!isAdminCredential(email, password)) {
    return NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, getAdminSessionCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
