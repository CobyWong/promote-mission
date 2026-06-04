import { NextResponse } from "next/server";

import { isLocale, localeCookieName, normalizeLocale } from "@/lib/i18n";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { locale?: string };
  const locale = normalizeLocale(body.locale);

  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Invalid locale." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, locale });
  response.cookies.set(localeCookieName, locale, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
