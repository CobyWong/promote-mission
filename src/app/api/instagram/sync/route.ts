import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";
import { syncMissionOneSubmissionsForUser } from "@/lib/instagram-system-sync";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const isZh = isZhRequest(request);
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: isZh ? "Instagram 同步服務暫時不可用，請稍後再試。" : "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: isZh ? "請先登入後再同步 Instagram。" : "Please log in first." }, { status: 401 });
  }

  if (!admin) {
    return NextResponse.json(
      { error: isZh ? "Instagram 同步服務暫時不可用，請稍後再試。" : "Instagram sync service unavailable." },
      { status: 503 },
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
        source: result.source,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: isZh
          ? (error instanceof Error ? error.message : "Instagram 同步失敗，請稍後再試。")
          : (error instanceof Error ? error.message : "Instagram sync failed."),
      },
      { status: 400 },
    );
  }
}
