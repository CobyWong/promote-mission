import { NextResponse } from "next/server";

import { THEME_COOKIE_KEY, normalizeTheme } from "@/lib/theme";

export async function POST(request: Request) {
  const body = (await request.json()) as { theme?: string };
  const theme = normalizeTheme(body.theme);

  const response = NextResponse.json({ theme });
  response.cookies.set(THEME_COOKIE_KEY, theme, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
