import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import { isZhRequest } from "@/lib/api-locale";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const isZh = isZhRequest(request);
  const isAuthed = await hasAdminSession();
  if (!isAuthed) {
    return NextResponse.json({ error: isZh ? "未授權存取。" : "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: isZh ? "推薦審核服務暫時不可用，請稍後再試。" : "Supabase is not configured." }, { status: 503 });
  }

  const { data, error } = await admin
    .from("referral_reward_holds")
    .select("id, referral_id, inviter_user_id, invited_user_id, submission_id, amount, risk_score, risk_flags, status, hold_until, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: isZh ? "讀取推薦審核資料失敗，請稍後再試。" : error.message }, { status: 500 });
  }

  return NextResponse.json({ holds: data ?? [] });
}
