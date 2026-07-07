import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import { createUserNotification } from "@/lib/notifications";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const isAuthed = await hasAdminSession();
  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
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
      title: "Referral reward auto released",
      message: `Your held referral reward (+${hold.amount} Coins) has been auto released.`,
      link: "/dashboard",
    });

    released += 1;
  }

  return NextResponse.json({ released });
}
