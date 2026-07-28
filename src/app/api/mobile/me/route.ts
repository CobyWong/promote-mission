import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";
import { getCreatorLevelFromTotalExp } from "@/lib/mission-rules";
import { getCreatorExpFromReelInsights } from "@/lib/creator-exp";

export async function GET(request: Request) {
  const isZh = isZhRequest(request);
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: isZh ? "使用者資料服務暫時不可用，請稍後再試。" : "Supabase admin mode is not configured." }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

  if (!token) {
    return NextResponse.json({ error: isZh ? "缺少登入憑證，請重新登入。" : "Missing bearer token." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: isZh ? "使用者資料服務暫時不可用，請稍後再試。" : "Supabase admin mode is not configured." }, { status: 503 });
  }

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: isZh ? "登入狀態無效或已過期，請重新登入。" : (userError?.message ?? "Unauthorized.") }, { status: 401 });
  }

  const [{ data: profile }, { data: transactions }, { data: reelInsights }, { data: submissions }] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, instagram_handle, niche, followers_range")
      .eq("id", user.id)
      .maybeSingle(),
    admin
      .from("coin_transactions")
      .select("amount")
      .eq("user_id", user.id),
    admin
      .from("reel_insights")
      .select("media_id, reel_url, plays, likes, metric_date, created_at")
      .eq("user_id", user.id),
    admin
      .from("submissions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "Approved"),
  ]);

  const balance = (transactions ?? []).reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const approvedMissionCount = (submissions ?? []).length;
  const approvedExp = getCreatorExpFromReelInsights(reelInsights ?? []);
  const userLevel = getCreatorLevelFromTotalExp(approvedExp);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? null,
      fullName: profile?.full_name ?? null,
      instagramHandle: profile?.instagram_handle ?? null,
      niche: profile?.niche ?? null,
      followersRange: profile?.followers_range ?? null,
      balance,
      approvedMissionCount,
      userLevel,
    },
  });
}