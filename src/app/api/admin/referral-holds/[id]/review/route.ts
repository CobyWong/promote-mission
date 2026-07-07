import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import { createUserNotification } from "@/lib/notifications";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Body = {
  action?: "approve" | "reject";
  notes?: string;
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const isAuthed = await hasAdminSession();
  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Body | null;

  const action = body?.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const { data: hold } = await admin
    .from("referral_reward_holds")
    .select("id, referral_id, inviter_user_id, submission_id, amount, status")
    .eq("id", id)
    .maybeSingle();

  if (!hold?.id) {
    return NextResponse.json({ error: "Hold not found." }, { status: 404 });
  }

  if (hold.status !== "pending") {
    return NextResponse.json({ error: "Hold already reviewed." }, { status: 409 });
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
      title: "Referral reward released",
      message: `Your held referral reward (+${hold.amount} Coins) has been approved and released.`,
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
    title: "Referral reward not approved",
    message: "Your held referral reward did not pass review.",
    link: "/dashboard",
    metadata: {
      holdId: hold.id,
    },
  });

  return NextResponse.json({ ok: true, status: "rejected" });
}
