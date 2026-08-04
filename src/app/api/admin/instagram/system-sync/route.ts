import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";
import { syncMissionOneSubmissionsForUsers } from "@/lib/instagram-system-sync";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getMissionOneSyncCronToken,
  hasMissionOneSyncCronToken,
  hasSupabaseAdminConfig,
} from "@/lib/supabase/env";

function unauthorizedResponse(isZh: boolean) {
  return NextResponse.json({ error: isZh ? "未授權存取。" : "Unauthorized" }, { status: 401 });
}

function parseMaxUsers(raw: string | null) {
  if (!raw) {
    return 0;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.min(parsed, 1000);
}

export async function POST(request: Request) {
  const isZh = isZhRequest(request);

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json(
      {
        synced: false,
        skipped: true,
        reason: "SUPABASE_ADMIN_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  if (!hasMissionOneSyncCronToken()) {
    return NextResponse.json(
      {
        synced: false,
        skipped: true,
        reason: "MISSIONONE_SYNC_CRON_TOKEN_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const expectedToken = getMissionOneSyncCronToken();
  const providedToken = request.headers.get("x-cron-token") ?? "";
  if (!providedToken || providedToken !== expectedToken) {
    return unauthorizedResponse(isZh);
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        synced: false,
        skipped: true,
        reason: "SUPABASE_ADMIN_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const maxUsers = parseMaxUsers(url.searchParams.get("maxUsers"));

  const { data: submissions, error: submissionsError } = await admin
    .from("submissions")
    .select("user_id")
    .in("status", ["Pending", "Approved"]);

  if (submissionsError) {
    return NextResponse.json(
      {
        error: isZh ? "讀取同步目標失敗，請稍後再試。" : "Unable to load sync targets.",
        detail: submissionsError.message,
      },
      { status: 500 },
    );
  }

  const userIds = Array.from(
    new Set(
      (submissions ?? [])
        .map((item) => item.user_id)
        .filter((item): item is string => typeof item === "string" && item.length > 0),
    ),
  );

  const targetUserIds = maxUsers > 0 ? userIds.slice(0, maxUsers) : userIds;

  const result = await syncMissionOneSubmissionsForUsers({
    admin,
    userIds: targetUserIds,
    locale: isZh ? "zh-HK" : "en",
  });

  return NextResponse.json(
    {
      synced: true,
      totalUsersFound: userIds.length,
      totalUsersTargeted: targetUserIds.length,
      maxUsers: maxUsers > 0 ? maxUsers : null,
      ...result,
      syncedAt: new Date().toISOString(),
    },
    { status: 200 },
  );
}
