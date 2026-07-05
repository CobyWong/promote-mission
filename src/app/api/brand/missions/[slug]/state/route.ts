import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isBrandOrAdminEmail } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedStatuses = ["draft", "active", "paused", "full", "ended", "archived"] as const;
type MissionLifecycleStatus = (typeof allowedStatuses)[number];

function isAllowedStatus(value: unknown): value is MissionLifecycleStatus {
  return typeof value === "string" && allowedStatuses.includes(value as MissionLifecycleStatus);
}

async function assertBrandAccess() {
  const [supabase, admin] = await Promise.all([
    createSupabaseServerClient(),
    Promise.resolve(createSupabaseAdminClient()),
  ]);

  if (!supabase || !admin) {
    return { error: NextResponse.json({ error: "Supabase brand mode is not configured." }, { status: 503 }) };
  }

  const [adminSession, {
    data: { user },
  }] = await Promise.all([hasAdminSession(), supabase.auth.getUser()]);

  if (!adminSession && (!user || !isBrandOrAdminEmail(user.email))) {
    return { error: NextResponse.json({ error: "Brand/admin access required." }, { status: 403 }) };
  }

  return { admin };
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const access = await assertBrandAccess();

  if ("error" in access) {
    return access.error;
  }

  const { slug } = await context.params;
  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  const status = body?.status?.toLowerCase();

  if (!isAllowedStatus(status)) {
    return NextResponse.json({ error: "Invalid mission status." }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const payload: {
    status: MissionLifecycleStatus;
    is_active: boolean;
    archived_at?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
  } = {
    status,
    is_active: status === "active",
  };

  if (status === "archived") {
    payload.archived_at = nowIso;
  }

  if (status === "active") {
    payload.archived_at = null;
  }

  if (status === "ended") {
    payload.ends_at = nowIso;
  }

  const { error } = await access.admin.from("missions").update(payload).eq("slug", slug);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, status });
}
