import { NextResponse } from "next/server";

import type { RewardRedemptionStatus } from "@/lib/data";
import { hasAdminSession } from "@/lib/admin-session";
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
    return NextResponse.json({ error: "Supabase admin mode is not configured." }, { status: 503 });
  }

  const [adminSession, {
    data: { user },
  }] = await Promise.all([hasAdminSession(), supabase.auth.getUser()]);

  if (!adminSession && (!user || !isAdminEmail(user.email))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const reviewerId = user?.id ?? null;

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
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
