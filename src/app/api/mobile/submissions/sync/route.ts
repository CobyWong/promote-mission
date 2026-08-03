import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";
import { syncMissionOneSubmissionsForUser } from "@/lib/instagram-system-sync";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";

export async function POST(request: Request) {
  const isZh = isZhRequest(request);

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json(
      { error: isZh ? "同步服務暫時不可用，請稍後再試。" : "Sync service is temporarily unavailable." },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

  if (!token) {
    return NextResponse.json({ error: isZh ? "缺少登入憑證，請重新登入。" : "Missing bearer token." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: isZh ? "同步服務暫時不可用，請稍後再試。" : "Sync service is temporarily unavailable." },
      { status: 503 },
    );
  }

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json(
      { error: isZh ? "登入狀態無效或已過期，請重新登入。" : (userError?.message ?? "Unauthorized.") },
      { status: 401 },
    );
  }

  try {
    const result = await syncMissionOneSubmissionsForUser({
      admin,
      userId: user.id,
      locale: isZh ? "zh-HK" : "en",
    });

    return NextResponse.json(
      {
        synced: result.insightsUpserted,
        autoSettled: result.autoSettled,
        matchedSubmissions: result.matchedSubmissions,
        pendingNeedsManualSubmission: result.pendingNeedsManualSubmission,
        pendingMissingRequiredTag: result.pendingMissingRequiredTag,
        missionOneMediaScanned: result.missionOneMediaScanned,
        source: result.source,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: isZh
          ? (error instanceof Error ? error.message : "同步失敗，請稍後再試。")
          : (error instanceof Error ? error.message : "Sync failed. Please try again later."),
      },
      { status: 400 },
    );
  }
}
