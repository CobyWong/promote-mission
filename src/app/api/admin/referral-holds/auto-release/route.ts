import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import { isZhRequest } from "@/lib/api-locale";
import { createUserNotification } from "@/lib/notifications";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const isZh = isZhRequest(request);
  const isAuthed = await hasAdminSession();
  if (!isAuthed) {
    return NextResponse.json({ error: isZh ? "未授權存取。" : "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: isZh ? "推薦審核服務暫時不可用，請稍後再試。" : "Supabase is not configured." }, { status: 503 });
  }

  const nowIso = new Date().toISOString();
  const { data: dueHolds } = await admin
    .from("referral_reward_holds")
    .select("id, referral_id, inviter_user_id, submission_id, amount")
    .eq("status", "pending")
    .lte("hold_until", nowIso)
    .limit(200);

  const rows = dueHolds ?? [];
  let released = 0;

  for (const hold of rows) {
    await admin.from("coin_transactions").insert({
      user_id: hold.inviter_user_id,
      submission_id: hold.submission_id,
      amount: Math.max(hold.amount ?? 0, 0),
      transaction_type: "referral_reward_release",
      description: `Referral hold auto release ${hold.id}`,
    });

    await admin
      .from("referral_reward_holds")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", hold.id);

    await admin
      .from("referrals")
      .update({
        reward_status: "released",
        review_status: "approved",
        referral_stage: "reward_released",
      })
      .eq("id", hold.referral_id);

    await createUserNotification({
      userId: hold.inviter_user_id,
      type: "system",
      title: isZh ? "推薦獎勵已自動發放" : "Referral reward auto released",
      message: isZh
        ? `你的暫緩推薦獎勵（+${hold.amount} Coins）已完成自動發放。`
        : `Your held referral reward (+${hold.amount} Coins) has been auto released.`,
      link: "/dashboard",
    });

    released += 1;
  }

  return NextResponse.json({ released });
}
