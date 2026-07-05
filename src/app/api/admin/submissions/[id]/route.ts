import { NextResponse } from "next/server";

import type { SubmissionStatus } from "@/lib/data";
import { hasAdminSession } from "@/lib/admin-session";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedStatuses: SubmissionStatus[] = ["Pending", "Needs edits", "Approved"];

async function syncSlaBreachForIds(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  ids: string[],
) {
  if (!admin || ids.length === 0) {
    return;
  }

  const { data } = await admin
    .from("submissions")
    .select("id, status, review_due_at, sla_breached_at")
    .in("id", ids);

  const rows = (data ?? []) as Array<{
    id: string;
    status: string;
    review_due_at: string | null;
    sla_breached_at: string | null;
  }>;

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const toMarkBreached: string[] = [];
  const toClearBreached: string[] = [];

  for (const row of rows) {
    const dueTime = row.review_due_at ? new Date(row.review_due_at).getTime() : null;
    const hasBreach = Boolean(row.sla_breached_at);
    const isOverdue = row.status !== "Approved" && dueTime !== null && !Number.isNaN(dueTime) && dueTime < now;

    if (isOverdue && !hasBreach) {
      toMarkBreached.push(row.id);
      continue;
    }

    if (!isOverdue && hasBreach) {
      toClearBreached.push(row.id);
    }
  }

  if (toMarkBreached.length > 0) {
    await admin.from("submissions").update({ sla_breached_at: nowIso }).in("id", toMarkBreached);
  }

  if (toClearBreached.length > 0) {
    await admin.from("submissions").update({ sla_breached_at: null }).in("id", toClearBreached);
  }
}

function toIsoOrNull(value: unknown) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  if (!value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
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

  const body = await request.json();
  const hasStatus = typeof body.status === "string";
  const status = (hasStatus ? String(body.status) : undefined) as SubmissionStatus | undefined;
  const notes = typeof body.notes === "string" ? (String(body.notes) || null) : undefined;
  const assignedReviewerId = typeof body.assignedReviewerId === "string" ? body.assignedReviewerId : body.assignedReviewerId === null ? null : undefined;
  const reviewDueAt = toIsoOrNull(body.reviewDueAt);

  if (status && !allowedStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid submission status." }, { status: 400 });
  }

  if (body.reviewDueAt !== undefined && reviewDueAt === undefined) {
    return NextResponse.json({ error: "Invalid review due time." }, { status: 400 });
  }

  if (status === "Approved") {
    const rpcArgs: Database["public"]["Functions"]["approve_submission"]["Args"] = {
      submission_id_input: id,
      reviewer_id_input: reviewerId,
      review_notes_input: notes,
    };

    const { error } = await admin.rpc("approve_submission", rpcArgs);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const settleArgs: Database["public"]["Functions"]["settle_referral_reward"]["Args"] = {
      approved_submission_id_input: id,
    };
    await admin.rpc("settle_referral_reward", settleArgs);

    if (assignedReviewerId !== undefined || reviewDueAt !== undefined) {
      const assignmentPayload: Database["public"]["Tables"]["submissions"]["Update"] = {
        assigned_reviewer_id: assignedReviewerId,
        review_due_at: reviewDueAt,
      };

      await admin.from("submissions").update(assignmentPayload).eq("id", id);
    }

    await syncSlaBreachForIds(admin, [id]);

    return NextResponse.json({ ok: true });
  }

  const updatePayload: Database["public"]["Tables"]["submissions"]["Update"] = {
    assigned_reviewer_id: assignedReviewerId,
    review_due_at: reviewDueAt,
  };

  if (status) {
    updatePayload.status = status;
    updatePayload.reviewed_at = new Date().toISOString();
    updatePayload.reviewed_by = reviewerId;
  }

  if (notes !== undefined) {
    updatePayload.notes = notes;
  }

  const { error } = await admin
    .from("submissions")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await syncSlaBreachForIds(admin, [id]);

  return NextResponse.json({ ok: true });
}
