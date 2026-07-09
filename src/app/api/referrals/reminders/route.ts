import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";
import { createUserNotification } from "@/lib/notifications";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const isZh = isZhRequest(request);
  const [supabase, admin] = await Promise.all([
    createSupabaseServerClient(),
    Promise.resolve(createSupabaseAdminClient()),
  ]);

  if (!supabase || !admin) {
    return NextResponse.json({ error: isZh ? "推薦提醒服務暫時不可用，請稍後再試。" : "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: isZh ? "請先登入後再發送推薦提醒。" : "Authentication required." }, { status: 401 });
  }

  const { data: referrals } = await admin
    .from("referrals")
    .select("id, invited_user_id, created_at, reminder_count")
    .eq("inviter_user_id", user.id);

  const rows = referrals ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const invitedUserIds = rows.map((item) => item.invited_user_id);
  const { data: approvedSubmissions } = await admin
    .from("submissions")
    .select("user_id")
    .in("user_id", invitedUserIds)
    .eq("status", "Approved");

  const approvedSet = new Set((approvedSubmissions ?? []).map((item) => item.user_id));
  const candidates = rows.filter((row) => !approvedSet.has(row.invited_user_id)).slice(0, 20);

  let sent = 0;

  for (const candidate of candidates) {
    await createUserNotification({
      userId: candidate.invited_user_id,
      type: "system",
      title: isZh ? "任務提醒" : "Mission reminder",
      message: isZh
        ? "你距離解鎖推薦獎勵只差一個已通過任務，請盡快完成首個任務。"
        : "You are one approved mission away from unlocking referral rewards. Complete your first mission now.",
      link: "/missions",
      metadata: {
        reminderType: "referral_nudge",
      },
    });

    await admin
      .from("referrals")
      .update({
        reminder_count: (candidate.reminder_count ?? 0) + 1,
        last_reminded_at: new Date().toISOString(),
      })
      .eq("id", candidate.id);

    sent += 1;
  }

  return NextResponse.json({ sent });
}
