import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";

const unavailableError = {
  zh: "暫時無法驗證 Instagram 帳號，請稍後再試。",
  en: "Unable to verify Instagram account right now. Please try again.",
};

const instagramRequestHeaders = {
  "user-agent": "Mozilla/5.0 (compatible; MissionOneBot/1.0)",
  "accept-language": "en-US,en;q=0.9",
};

type ValidationResult = "valid" | "invalid" | "unavailable";

type InstagramProfilePayload = {
  data?: {
    user?: {
      username?: string;
    };
  };
};

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

function unavailableResponse(isZh: boolean) {
  return NextResponse.json(
    { valid: false, error: isZh ? unavailableError.zh : unavailableError.en },
    { status: 503 },
  );
}

async function tryValidateByProfileInfo(handle: string): Promise<ValidationResult> {
  const profileInfoUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`;
  const response = await fetch(profileInfoUrl, {
    headers: {
      ...instagramRequestHeaders,
      "x-ig-app-id": "936619743392459",
    },
    cache: "no-store",
  });

  if (response.status === 404) {
    return "invalid";
  }

  if (!response.ok) {
    return "unavailable";
  }

  const payload = (await response.json().catch(() => null)) as InstagramProfilePayload | null;
  const discoveredUsername = payload?.data?.user?.username?.toLowerCase() ?? "";

  if (!discoveredUsername) {
    return "unavailable";
  }

  return discoveredUsername === handle ? "valid" : "invalid";
}

async function tryValidateByProfileHtml(handle: string): Promise<ValidationResult> {
  const profileResponse = await fetch(`https://www.instagram.com/${encodeURIComponent(handle)}/`, {
    headers: instagramRequestHeaders,
    cache: "no-store",
  });

  if (!profileResponse.ok) {
    return "unavailable";
  }

  const html = await profileResponse.text();
  const pageUnavailable = /Sorry, this page isn't available|Page isn't available/i.test(html);
  if (pageUnavailable) {
    return "invalid";
  }

  const discoveredUsername = extractUsernameFromHtml(html);
  if (!discoveredUsername) {
    return "unavailable";
  }

  return discoveredUsername === handle ? "valid" : "invalid";
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
    const profileInfoValidation = await tryValidateByProfileInfo(handle);

    if (profileInfoValidation === "valid") {
      return NextResponse.json({ valid: true });
    }

    if (profileInfoValidation === "invalid") {
      return NextResponse.json({ valid: false });
    }

    const profileHtmlValidation = await tryValidateByProfileHtml(handle);

    if (profileHtmlValidation === "valid") {
      return NextResponse.json({ valid: true });
    }

    if (profileHtmlValidation === "invalid") {
      return NextResponse.json({ valid: false });
    }

    return unavailableResponse(isZh);
  } catch {
    return unavailableResponse(isZh);
  }
}