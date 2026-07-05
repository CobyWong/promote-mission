import { NextResponse } from "next/server";

import type { SubmissionStatus } from "@/lib/data";
import { hasAdminSession } from "@/lib/admin-session";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedStatuses: SubmissionStatus[] = ["Pending", "Needs edits", "Approved"];

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

export async function PATCH(request: Request) {
  const [supabase, admin] = await Promise.all([
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
  const body = (await request.json().catch(() => null)) as {
    ids?: string[];
    status?: SubmissionStatus;
    notes?: string;
    assignedReviewerId?: string | null;
    reviewDueAt?: string | null;
  } | null;

  const ids = Array.isArray(body?.ids) ? body.ids.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "ids are required." }, { status: 400 });
  }

  const status = body?.status;
  const notes = typeof body?.notes === "string" ? body.notes : undefined;
  const assignedReviewerId = typeof body?.assignedReviewerId === "string"
    ? body.assignedReviewerId
    : body?.assignedReviewerId === null
      ? null
      : undefined;
  const reviewDueAt = toIsoOrNull(body?.reviewDueAt);

  if (status && !allowedStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid submission status." }, { status: 400 });
  }

  if (body?.reviewDueAt !== undefined && reviewDueAt === undefined) {
    return NextResponse.json({ error: "Invalid review due time." }, { status: 400 });
  }

  if (status === "Approved") {
    for (const id of ids) {
      const rpcArgs: Database["public"]["Functions"]["approve_submission"]["Args"] = {
        submission_id_input: id,
        reviewer_id_input: reviewerId,
        review_notes_input: notes ?? null,
      };

      const { error } = await admin.rpc("approve_submission", rpcArgs);
      if (error) {
        return NextResponse.json({ error: error.message, failedId: id }, { status: 400 });
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
    }

    return NextResponse.json({ ok: true, updatedCount: ids.length });
  }

  const payload: Database["public"]["Tables"]["submissions"]["Update"] = {
    assigned_reviewer_id: assignedReviewerId,
    review_due_at: reviewDueAt,
  };

  if (status) {
    payload.status = status;
    payload.reviewed_at = new Date().toISOString();
    payload.reviewed_by = reviewerId;
  }

  if (notes !== undefined) {
    payload.notes = notes || null;
  }

  const { error } = await admin.from("submissions").update(payload).in("id", ids);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, updatedCount: ids.length });
}
