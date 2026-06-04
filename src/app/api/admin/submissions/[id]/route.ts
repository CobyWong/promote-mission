import { NextResponse } from "next/server";

import type { SubmissionStatus } from "@/lib/data";
import { hasAdminSession } from "@/lib/admin-session";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedStatuses: SubmissionStatus[] = ["Pending", "Needs edits", "Approved"];

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
  const status = String(body.status ?? "Pending") as SubmissionStatus;
  const notes = String(body.notes ?? "") || null;

  if (!allowedStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid submission status." }, { status: 400 });
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

    return NextResponse.json({ ok: true });
  }

  const updatePayload: Database["public"]["Tables"]["submissions"]["Update"] = {
    status,
    notes,
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewerId,
  };

  const { error } = await admin
    .from("submissions")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
