import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import { isZhRequest } from "@/lib/api-locale";
import { isSameOriginMutationRequest } from "@/lib/csrf";
import { getMissionRewardCoins } from "@/lib/mission-rules";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isBrandOrAdminEmail } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

function normalizeLifecycleStatus(value: unknown): Database["public"]["Tables"]["missions"]["Update"]["status"] {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.toLowerCase();
  return ["draft", "active", "paused", "full", "ended", "archived"].includes(normalized)
    ? normalized
    : undefined;
}

function normalizeDifficultyLabel(value: unknown): "Easy" | "Medium" | "Hard" | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.toLowerCase();
  if (normalized === "hard") {
    return "Hard";
  }

  if (normalized === "medium") {
    return "Medium";
  }

  if (normalized === "easy") {
    return "Easy";
  }

  return undefined;
}

function toIsoOrUndefined(value: unknown) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  if (value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export async function PATCH(request: Request, context: { params: Promise<{ slug: string }> }) {
  const isZh = isZhRequest(request);
  if (!isSameOriginMutationRequest(request)) {
    return NextResponse.json({ error: isZh ? "來源驗證失敗，請重新整理後再試。" : "Request origin verification failed." }, { status: 403 });
  }

  const access = await assertBrandAccess(request);

  if ("error" in access) {
    return access.error;
  }

  const { slug } = await context.params;
  const body = (await request.json()) as Partial<Database["public"]["Tables"]["missions"]["Update"]>;
  const normalizedDifficulty = normalizeDifficultyLabel(body.difficulty);

  const payload: Database["public"]["Tables"]["missions"]["Update"] = {
    title: typeof body.title === "string" ? body.title : undefined,
    brand: typeof body.brand === "string" ? body.brand : undefined,
    product: typeof body.product === "string" ? body.product : undefined,
    mission_image_url: typeof body.mission_image_url === "string" ? body.mission_image_url : undefined,
    reward_coins: normalizedDifficulty ? getMissionRewardCoins(normalizedDifficulty) : undefined,
    difficulty: normalizedDifficulty,
    eta: typeof body.eta === "string" ? body.eta : undefined,
    category: typeof body.category === "string" ? body.category : undefined,
    description: typeof body.description === "string" ? body.description : undefined,
    hook: typeof body.hook === "string" ? body.hook : undefined,
    requirements: Array.isArray(body.requirements) ? body.requirements : undefined,
    deliverables: Array.isArray(body.deliverables) ? body.deliverables : undefined,
    tags: Array.isArray(body.tags) ? body.tags : undefined,
    status: normalizeLifecycleStatus(body.status),
    starts_at: toIsoOrUndefined(body.starts_at),
    ends_at: toIsoOrUndefined(body.ends_at),
    archived_at: toIsoOrUndefined(body.archived_at),
    is_active: typeof body.is_active === "boolean"
      ? body.is_active
      : normalizeLifecycleStatus(body.status) === "active"
        ? true
        : normalizeLifecycleStatus(body.status)
          ? false
          : undefined,
    display_order: typeof body.display_order === "number" ? body.display_order : undefined,
    min_participants: typeof body.min_participants === "number" ? body.min_participants : undefined,
    current_participants: typeof body.current_participants === "number" ? body.current_participants : undefined,
  };

  const { error } = await access.admin.from("missions").update(payload).eq("slug", slug);

  if (error) {
    return NextResponse.json({ error: isZh ? "更新任務失敗，請稍後再試。" : error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: { params: Promise<{ slug: string }> }) {
  const isZh = isZhRequest(request);
  if (!isSameOriginMutationRequest(request)) {
    return NextResponse.json({ error: isZh ? "來源驗證失敗，請重新整理後再試。" : "Request origin verification failed." }, { status: 403 });
  }

  const access = await assertBrandAccess(request);

  if ("error" in access) {
    return access.error;
  }

  const { slug } = await context.params;

  const { error } = await access.admin.from("missions").delete().eq("slug", slug);

  if (error) {
    return NextResponse.json({ error: isZh ? "刪除任務失敗，請稍後再試。" : error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
