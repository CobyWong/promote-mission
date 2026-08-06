import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  exchangeCodeForLongLivedToken,
  fetchInstagramBusinessAccount,
  hasInstagramConfig,
} from "@/lib/instagram";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function sanitizeNextPath(raw: string | null | undefined, fallback = "/dashboard") {
  if (!raw) {
    return fallback;
  }

  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }

  return raw;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error_reason") ?? url.searchParams.get("error_description");

  const cookieStore = await cookies();
  const nextFromCookie = sanitizeNextPath(cookieStore.get("ig_oauth_next")?.value, "/dashboard");
  const returnUrl = new URL(nextFromCookie, request.url);

  if (!hasInstagramConfig()) {
    returnUrl.searchParams.set("ig", "not-configured");
    return NextResponse.redirect(returnUrl);
  }

  const stateFromCookie = cookieStore.get("ig_oauth_state")?.value;
  cookieStore.delete("ig_oauth_state");
  cookieStore.delete("ig_oauth_next");

  if (oauthError) {
    returnUrl.searchParams.set("ig", "denied");
    return NextResponse.redirect(returnUrl);
  }

  if (!code || !state || state !== stateFromCookie) {
    returnUrl.searchParams.set("ig", "state-mismatch");
    return NextResponse.redirect(returnUrl);
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    returnUrl.searchParams.set("ig", "supabase-missing");
    return NextResponse.redirect(returnUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", nextFromCookie);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { accessToken, expiresIn, shortAccessToken } = await exchangeCodeForLongLivedToken(code);

    let account;
    try {
      account = await fetchInstagramBusinessAccount(accessToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const shouldFallbackToShortToken = message.includes("No Facebook Pages were returned by Meta OAuth");

      if (!shouldFallbackToShortToken) {
        throw error;
      }

      account = await fetchInstagramBusinessAccount(shortAccessToken);
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const connectionPayload: Database["public"]["Tables"]["instagram_connections"]["Insert"] = {
      user_id: user.id,
      instagram_user_id: account.instagramUserId,
      instagram_username: account.instagramUsername,
      facebook_page_name: account.facebookPageName,
      access_token: accessToken,
      token_expires_at: expiresAt,
      status: "active",
      last_synced_at: null,
      last_error: null,
    };

    const { error } = await supabase
      .from("instagram_connections")
      .upsert(connectionPayload, { onConflict: "user_id" });

    if (error) {
      throw new Error(error.message);
    }

    returnUrl.searchParams.set("ig", "connected");
    return NextResponse.redirect(returnUrl);
  } catch (error) {
    returnUrl.searchParams.set("ig", "failed");
    returnUrl.searchParams.set("ig_message", error instanceof Error ? error.message : "Failed to connect Instagram account.");
    return NextResponse.redirect(returnUrl);
  }
}
