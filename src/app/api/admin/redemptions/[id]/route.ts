import { NextResponse } from "next/server";

import type { RewardRedemptionStatus } from "@/lib/data";
import { hasAdminSession } from "@/lib/admin-session";
import { createUserNotification } from "@/lib/notifications";
import { createAppLog } from "@/lib/observability";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedStatuses: RewardRedemptionStatus[] = ["Pending", "Fulfilled", "Rejected"];

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const [{ id }, supabase, admin] = await Promise.all([
    context.params,
    createSupabaseServerClient(),
    Promise.resolve(createSupabaseAdminClient()),
  ]);

  if (!supabase || !admin) {
    await createAppLog({
      level: "error",
      category: "admin_redemptions",
      event: "redemption_update_unavailable",
      message: "Supabase admin mode is not configured.",
      route: "/api/admin/redemptions/[id]",
      context: { redemptionId: id },
    });
    return NextResponse.json({ error: "Supabase admin mode is not configured." }, { status: 503 });
  }

  const [adminSession, {
    data: { user },
  }] = await Promise.all([hasAdminSession(), supabase.auth.getUser()]);

  if (!adminSession && (!user || !isAdminEmail(user.email))) {
    await createAppLog({
      level: "warn",
      category: "auth",
      event: "admin_redemption_forbidden",
      message: "Admin access required.",
      route: "/api/admin/redemptions/[id]",
      userId: user?.id ?? null,
      context: { redemptionId: id },
    });
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const reviewerId = user?.id ?? null;

  const { data: existingRedemption } = await admin
    .from("reward_redemptions")
    .select("id, user_id, reward_name, status")
    .eq("id", id)
    .maybeSingle();

  if (!existingRedemption) {
    return NextResponse.json({ error: "Redemption not found." }, { status: 404 });
  }

  const body = (await request.json()) as { status?: string; notes?: string };
  const status = String(body.status ?? "Pending") as RewardRedemptionStatus;
  const notes = String(body.notes ?? "") || null;

  if (!allowedStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid redemption status." }, { status: 400 });
  }

  const payload: Database["public"]["Tables"]["reward_redemptions"]["Update"] = {
    status,
    notes,
    reviewed_by: reviewerId,
    fulfilled_at: status === "Fulfilled" ? new Date().toISOString() : null,
  };

  const { error } = await admin.from("reward_redemptions").update(payload).eq("id", id);

  if (error) {
    await createAppLog({
      level: "error",
      category: "admin_redemptions",
      event: "redemption_update_failed",
      message: error.message,
      route: "/api/admin/redemptions/[id]",
      userId: reviewerId,
      context: { redemptionId: id, status },
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (status === "Fulfilled") {
    await createUserNotification({
      userId: existingRedemption.user_id,
      type: "redemption_fulfilled",
      title: "Reward fulfilled",
      message: `Your redemption for \"${existingRedemption.reward_name}\" is fulfilled.`,
      link: "/rewards",
      metadata: {
        redemptionId: id,
        rewardName: existingRedemption.reward_name,
      },
    });
  }

  if (status === "Rejected") {
    await createUserNotification({
      userId: existingRedemption.user_id,
      type: "redemption_rejected",
      title: "Reward redemption rejected",
      message: `Your redemption for \"${existingRedemption.reward_name}\" was rejected.`,
      link: "/rewards",
      metadata: {
        redemptionId: id,
        rewardName: existingRedemption.reward_name,
      },
    });
  }

  await createAppLog({
    level: "info",
    category: "admin_redemptions",
    event: "redemption_updated",
    route: "/api/admin/redemptions/[id]",
    userId: reviewerId,
    context: { redemptionId: id, status },
  });

  return NextResponse.json({ ok: true });
}
