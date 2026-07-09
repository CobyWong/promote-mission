import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import { isZhRequest } from "@/lib/api-locale";
import { createUserNotification } from "@/lib/notifications";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Body = {
  action?: "approve" | "reject";
  notes?: string;
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const isZh = isZhRequest(request);
  const isAuthed = await hasAdminSession();
  if (!isAuthed) {
    return NextResponse.json({ error: isZh ? "未授權存取。" : "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: isZh ? "推薦審核服務暫時不可用，請稍後再試。" : "Supabase is not configured." }, { status: 503 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Body | null;

  const action = body?.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: isZh ? "操作指令無效。" : "Invalid action." }, { status: 400 });
  }

  const { data: hold } = await admin
    .from("referral_reward_holds")
    .select("id, referral_id, inviter_user_id, submission_id, amount, status")
    .eq("id", id)
    .maybeSingle();

  if (!hold?.id) {
    return NextResponse.json({ error: isZh ? "找不到指定的審核暫緩紀錄。" : "Hold not found." }, { status: 404 });
  }

  if (hold.status !== "pending") {
    return NextResponse.json({ error: isZh ? "此暫緩紀錄已完成審核。" : "Hold already reviewed." }, { status: 409 });
  }

  if (action === "approve") {
    await admin.from("coin_transactions").insert({
      user_id: hold.inviter_user_id,
      submission_id: hold.submission_id,
      amount: Math.max(hold.amount ?? 0, 0),
      transaction_type: "referral_reward_release",
      description: `Referral hold released ${hold.id}`,
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
      title: isZh ? "推薦獎勵已發放" : "Referral reward released",
      message: isZh
        ? `你的暫緩推薦獎勵（+${hold.amount} Coins）已通過審核並完成發放。`
        : `Your held referral reward (+${hold.amount} Coins) has been approved and released.`,
      link: "/dashboard",
      metadata: {
        holdId: hold.id,
      },
    });

    return NextResponse.json({ ok: true, status: "approved" });
  }

  await admin
    .from("referral_reward_holds")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", hold.id);

  await admin
    .from("referrals")
    .update({
      reward_status: "forfeited",
      review_status: "rejected",
      referral_stage: "reward_cancelled",
    })
    .eq("id", hold.referral_id);

  await createUserNotification({
    userId: hold.inviter_user_id,
    type: "system",
    title: isZh ? "推薦獎勵未獲批准" : "Referral reward not approved",
    message: isZh ? "你的暫緩推薦獎勵未能通過審核。" : "Your held referral reward did not pass review.",
    link: "/dashboard",
    metadata: {
      holdId: hold.id,
    },
  });

  return NextResponse.json({ ok: true, status: "rejected" });
}
