import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";
import { isSameOriginMutationRequest } from "@/lib/csrf";
import { beginIdempotentOperation, finalizeIdempotentOperation } from "@/lib/idempotency";
import { isMissionOpenForApplications } from "@/lib/mission-lifecycle";
import { createAppLog } from "@/lib/observability";
import { evaluateRateLimit, getClientFingerprint, getRetryAfterSeconds } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminConfig, hasSupabaseConfig } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const isZh = isZhRequest(request);
  if (!isSameOriginMutationRequest(request)) {
    return NextResponse.json({ error: isZh ? "來源驗證失敗，請重新整理後再試。" : "Request origin verification failed." }, { status: 403 });
  }

  const { slug } = await context.params;

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: isZh ? "任務參與服務暫時不可用，請稍後再試。" : "Mission interest service unavailable." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: isZh ? "請先登入後再接受任務。" : "Please log in before accepting missions." }, { status: 401 });
  }

  const limiter = await evaluateRateLimit({
    namespace: "mission-interest",
    key: `${getClientFingerprint(request)}:${user.id}:${slug}`,
    max: 6,
    windowMs: 60_000,
  });

  if (!limiter.allowed) {
    const retryAfter = getRetryAfterSeconds(limiter.resetAt);
    return NextResponse.json(
      { error: isZh ? "請求過於頻繁，請稍後再試。" : "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: { "retry-after": String(retryAfter) },
      },
    );
  }

  const operation = await beginIdempotentOperation({
    namespace: "mission-interest",
    actorId: user.id,
    request,
    fallbackSeed: `${user.id}:${slug}`,
    ttlMs: 2 * 60 * 1000,
  });

  if (operation.mode === "replay") {
    return NextResponse.json(operation.body as Record<string, unknown>, { status: operation.status });
  }

  if (operation.mode === "inflight") {
    return NextResponse.json(
      { error: isZh ? "相同請求仍在處理中，請稍候再試。" : "A similar request is still being processed." },
      { status: 409 },
    );
  }

  if (!hasSupabaseConfig() || !hasSupabaseAdminConfig()) {
    const errorBody = { error: isZh ? "任務參與服務暫時不可用，請稍後再試。" : "Mission interest service unavailable." };
    await finalizeIdempotentOperation({
      storageKey: operation.storageKey,
      ttlMs: operation.ttlMs,
      status: 503,
      body: errorBody,
    });
    return NextResponse.json(errorBody, { status: 503 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    const errorBody = { error: isZh ? "任務參與服務暫時不可用，請稍後再試。" : "Mission interest service unavailable." };
    await finalizeIdempotentOperation({
      storageKey: operation.storageKey,
      ttlMs: operation.ttlMs,
      status: 503,
      body: errorBody,
    });
    return NextResponse.json(errorBody, { status: 503 });
  }

  const { data: mission } = await admin
    .from("missions")
    .select("current_participants, status, starts_at, ends_at")
    .eq("slug", slug)
    .single();

  if (!mission) {
    const errorBody = { error: isZh ? "找不到此任務。" : "Mission not found." };
    await finalizeIdempotentOperation({
      storageKey: operation.storageKey,
      ttlMs: operation.ttlMs,
      status: 404,
      body: errorBody,
    });
    return NextResponse.json(errorBody, { status: 404 });
  }

  if (!isMissionOpenForApplications({
    status: mission.status,
    starts_at: mission.starts_at,
    ends_at: mission.ends_at,
  })) {
    const errorBody = {
      error: isZh
        ? "此任務已過截止時間或暫未開放，暫時不能申請。"
        : "This mission is closed for new applications (deadline passed or not active).",
    };
    await finalizeIdempotentOperation({
      storageKey: operation.storageKey,
      ttlMs: operation.ttlMs,
      status: 409,
      body: errorBody,
    });
    return NextResponse.json(errorBody, { status: 409 });
  }

  const nextCount = (mission?.current_participants ?? 0) + 1;

  const { error } = await admin
    .from("missions")
    .update({ current_participants: nextCount })
    .eq("slug", slug);

  if (error) {
    const errorBody = { error: isZh ? "更新任務參與人數失敗，請稍後再試。" : error.message };
    await finalizeIdempotentOperation({
      storageKey: operation.storageKey,
      ttlMs: operation.ttlMs,
      status: 400,
      body: errorBody,
    });
    return NextResponse.json(errorBody, { status: 400 });
  }

  await createAppLog({
    level: "info",
    category: "funnel",
    event: "funnel.mission_accepted",
    route: "/api/missions/[slug]/interest",
    userId: user?.id ?? null,
    context: {
      missionSlug: slug,
      method: request.method,
      channel: "web",
      participantsAfter: nextCount,
    },
  });

  const successBody = { ok: true, count: nextCount };
  await finalizeIdempotentOperation({
    storageKey: operation.storageKey,
    ttlMs: operation.ttlMs,
    status: 200,
    body: successBody,
  });

  return NextResponse.json(successBody);
}
