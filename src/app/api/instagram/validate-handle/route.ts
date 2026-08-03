import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";

function normalizeHandle(raw: string | null) {
  return String(raw ?? "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function isHandleFormatValid(handle: string) {
  return /^[a-z0-9._]{1,30}$/i.test(handle);
}

function extractUsernameFromHtml(html: string) {
  const match = html.match(/"username":"([^"]+)"/);
  return match?.[1]?.toLowerCase() ?? "";
}

export async function GET(request: Request) {
  const isZh = isZhRequest(request);
  const url = new URL(request.url);
  const handle = normalizeHandle(url.searchParams.get("handle"));

  if (!handle || !isHandleFormatValid(handle)) {
    return NextResponse.json(
      { valid: false, error: isZh ? "Instagram 帳號格式不正確。" : "Invalid Instagram handle format." },
      { status: 400 },
    );
  }

  try {
    const profileResponse = await fetch(`https://www.instagram.com/${encodeURIComponent(handle)}/`, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; MissionOneBot/1.0)",
        "accept-language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });

    if (!profileResponse.ok) {
      return NextResponse.json(
        { valid: false, error: isZh ? "暫時無法驗證 Instagram 帳號，請稍後再試。" : "Unable to verify Instagram account right now. Please try again." },
        { status: 503 },
      );
    }

    const html = await profileResponse.text();
    const pageUnavailable = /Sorry, this page isn't available|Page isn't available/i.test(html);
    if (pageUnavailable) {
      return NextResponse.json({ valid: false });
    }

    const discoveredUsername = extractUsernameFromHtml(html);
    if (!discoveredUsername) {
      return NextResponse.json(
        { valid: false, error: isZh ? "暫時無法驗證 Instagram 帳號，請稍後再試。" : "Unable to verify Instagram account right now. Please try again." },
        { status: 503 },
      );
    }

    const valid = discoveredUsername === handle;

    return NextResponse.json({ valid });
  } catch {
    return NextResponse.json(
      { valid: false, error: isZh ? "暫時無法驗證 Instagram 帳號，請稍後再試。" : "Unable to verify Instagram account right now. Please try again." },
      { status: 503 },
    );
  }
}