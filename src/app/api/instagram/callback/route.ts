import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  exchangeCodeForLongLivedToken,
  fetchInstagramBusinessAccount,
  hasInstagramConfig,
} from "@/lib/instagram";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error_reason") ?? url.searchParams.get("error_description");

  const dashboardUrl = new URL("/dashboard", request.url);

  if (!hasInstagramConfig()) {
    dashboardUrl.searchParams.set("ig", "not-configured");
    return NextResponse.redirect(dashboardUrl);
  }

  const cookieStore = await cookies();
  const stateFromCookie = cookieStore.get("ig_oauth_state")?.value;
  cookieStore.delete("ig_oauth_state");

  if (oauthError) {
    dashboardUrl.searchParams.set("ig", "denied");
    return NextResponse.redirect(dashboardUrl);
  }

  if (!code || !state || state !== stateFromCookie) {
    dashboardUrl.searchParams.set("ig", "state-mismatch");
    return NextResponse.redirect(dashboardUrl);
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    dashboardUrl.searchParams.set("ig", "supabase-missing");
    return NextResponse.redirect(dashboardUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", "/dashboard");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { accessToken, expiresIn } = await exchangeCodeForLongLivedToken(code);
    const account = await fetchInstagramBusinessAccount(accessToken);
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

    dashboardUrl.searchParams.set("ig", "connected");
    return NextResponse.redirect(dashboardUrl);
  } catch (error) {
    dashboardUrl.searchParams.set("ig", "failed");
    dashboardUrl.searchParams.set("ig_message", error instanceof Error ? error.message : "Failed to connect Instagram account.");
    return NextResponse.redirect(dashboardUrl);
  }
}
