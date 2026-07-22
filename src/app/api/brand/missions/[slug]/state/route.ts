import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import { isZhRequest } from "@/lib/api-locale";
import { isSameOriginMutationRequest } from "@/lib/csrf";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isBrandOrAdminEmail } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedStatuses = ["draft", "active", "paused", "full", "ended", "archived"] as const;
type MissionLifecycleStatus = (typeof allowedStatuses)[number];

function isAllowedStatus(value: unknown): value is MissionLifecycleStatus {
  return typeof value === "string" && allowedStatuses.includes(value as MissionLifecycleStatus);
}

async function assertBrandAccess(request: Request) {
  const isZh = isZhRequest(request);
  const [supabase, admin] = await Promise.all([
    createSupabaseServerClient(),
    Promise.resolve(createSupabaseAdminClient()),
  ]);

  if (!supabase || !admin) {
    return { error: NextResponse.json({ error: isZh ? "品牌管理服務暫時不可用，請稍後再試。" : "Supabase brand mode is not configured." }, { status: 503 }) };
  }

  const [adminSession, {
    data: { user },
  }] = await Promise.all([hasAdminSession(), supabase.auth.getUser()]);

  if (!adminSession && (!user || !isBrandOrAdminEmail(user.email))) {
    return { error: NextResponse.json({ error: isZh ? "你目前沒有品牌或管理員權限。" : "Brand/admin access required." }, { status: 403 }) };
  }

  return { admin };
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const isZh = isZhRequest(request);
  if (!isSameOriginMutationRequest(request)) {
    return NextResponse.json({ error: isZh ? "來源驗證失敗，請重新整理後再試。" : "Request origin verification failed." }, { status: 403 });
  }

  const access = await assertBrandAccess(request);

  if ("error" in access) {
    return access.error;
  }

  const { slug } = await context.params;
  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  const status = body?.status?.toLowerCase();

  if (!isAllowedStatus(status)) {
    return NextResponse.json({ error: isZh ? "任務狀態無效。" : "Invalid mission status." }, { status: 400 });
  }

  if (status === "active") {
    const { data: missionRow } = await access.admin
      .from("missions")
      .select("ends_at")
      .eq("slug", slug)
      .maybeSingle();

    if (!missionRow) {
      return NextResponse.json({ error: isZh ? "找不到任務。" : "Mission not found." }, { status: 404 });
    }

    if (!missionRow.ends_at) {
      return NextResponse.json(
        { error: isZh ? "任務必須先設定截止時間，才可啟用。" : "Set mission deadline before activating this mission." },
        { status: 400 },
      );
    }
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
    return NextResponse.json({ error: isZh ? "更新任務狀態失敗，請稍後再試。" : error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, status });
}
