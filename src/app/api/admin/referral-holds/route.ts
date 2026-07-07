import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const isAuthed = await hasAdminSession();
  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { data, error } = await admin
    .from("referral_reward_holds")
    .select("id, referral_id, inviter_user_id, invited_user_id, submission_id, amount, risk_score, risk_flags, status, hold_until, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ holds: data ?? [] });
}
