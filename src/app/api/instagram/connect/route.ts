import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";
import { buildInstagramOAuthUrl, getMissingInstagramConfig, hasInstagramConfig } from "@/lib/instagram";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const isZh = isZhRequest(request);
  if (!hasInstagramConfig()) {
    return NextResponse.json(
      {
        error: isZh ? "Instagram 整合服務尚未完成設定。" : "Instagram integration is not configured.",
        missing: getMissingInstagramConfig(),
      },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: isZh ? "Instagram 連線服務暫時不可用，請稍後再試。" : "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", "/dashboard");
    return NextResponse.redirect(loginUrl);
  }

  const state = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("ig_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  });

  return NextResponse.redirect(buildInstagramOAuthUrl(state));
}
