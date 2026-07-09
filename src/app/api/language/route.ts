import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";
import { isLocale, localeCookieName, normalizeLocale } from "@/lib/i18n";

export async function POST(request: Request) {
  const isZh = isZhRequest(request);
  const body = (await request.json().catch(() => ({}))) as { locale?: string };
  const locale = normalizeLocale(body.locale);

  if (!isLocale(locale)) {
    return NextResponse.json({ error: isZh ? "語言設定無效。" : "Invalid locale." }, { status: 400 });
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
