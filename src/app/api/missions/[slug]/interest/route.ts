import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";
import { isSameOriginMutationRequest } from "@/lib/csrf";
import { beginIdempotentOperation, finalizeIdempotentOperation } from "@/lib/idempotency";
import { isMissionOpenForApplications } from "@/lib/mission-lifecycle";
import { getMissionRewardCoins } from "@/lib/mission-rules";
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
    .select("slug, title, brand, difficulty, current_participants, status, starts_at, ends_at")
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

  const { data: existingSubmission } = await admin
    .from("submissions")
    .select("id")
    .eq("user_id", user.id)
    .eq("mission_slug", slug)
    .in("status", ["Pending", "Approved"])
    .maybeSingle();

  if (existingSubmission) {
    const successBody = {
      ok: true,
      count: mission.current_participants ?? 0,
      alreadyApplied: true,
      submissionId: existingSubmission.id,
    };
    await finalizeIdempotentOperation({
      storageKey: operation.storageKey,
      ttlMs: operation.ttlMs,
      status: 200,
      body: successBody,
    });

    return NextResponse.json(successBody);
  }

  const { data: latestCollaboratorReel } = await admin
    .from("reel_insights")
    .select("reel_url, metric_date, created_at")
    .eq("user_id", user.id)
    .contains("raw_metrics", { hasMissionOneCollaborator: true })
    .order("metric_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestCollaboratorReel?.reel_url) {
    const errorBody = {
      error: isZh
        ? "未找到包含 @missionone_hk 協作者的 Reels。請先發佈並完成 Instagram 同步後再接受任務。"
        : "No Reel with @missionone_hk collaborator was found. Publish it first and run Instagram sync before accepting mission.",
    };
    await finalizeIdempotentOperation({
      storageKey: operation.storageKey,
      ttlMs: operation.ttlMs,
      status: 409,
      body: errorBody,
    });

    return NextResponse.json(errorBody, { status: 409 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, instagram_handle")
    .eq("id", user.id)
    .maybeSingle();

  const { data: submissionCreated, error: submissionError } = await admin
    .from("submissions")
    .insert({
      user_id: user.id,
      mission_slug: mission.slug,
      mission_title: mission.title,
      mission_brand: mission.brand,
      reward_coins: getMissionRewardCoins(mission.difficulty ?? "Easy"),
      reel_url: latestCollaboratorReel.reel_url,
      caption_summary: null,
      notes: isZh
        ? "系統已自動檢測包含 @missionone_hk 協作者的 Reels，無需手動提交 proof。"
        : "Auto-detected Reel with @missionone_hk collaborator. Manual proof submission is not required.",
      checklist: {
        addedCollaborator: true,
        autoDetectedByInstagramSync: true,
      },
      screenshot_count: 0,
      screenshot_paths: [],
      creator_name: profile?.full_name ?? user.email ?? "Creator",
      creator_handle: profile?.instagram_handle ?? null,
      status: "Pending",
    })
    .select("id")
    .single();

  if (submissionError || !submissionCreated?.id) {
    const errorBody = {
      error: isZh
        ? "已登記任務，但自動建立任務提交失敗，請稍後重試。"
        : `Mission accepted but failed to auto-create submission: ${submissionError?.message ?? "unknown error"}`,
    };
    await finalizeIdempotentOperation({
      storageKey: operation.storageKey,
      ttlMs: operation.ttlMs,
      status: 400,
      body: errorBody,
    });

    return NextResponse.json(errorBody, { status: 400 });
  }

  const { error: autoApproveError } = await admin.rpc("approve_submission", {
    submission_id_input: submissionCreated.id,
    reviewer_id_input: null,
    review_notes_input: isZh
      ? "系統已根據 Instagram 同步協作者資料自動審核通過。"
      : "Auto-approved from Instagram sync collaborator detection.",
  });

  if (autoApproveError) {
    const errorBody = {
      error: isZh
        ? "任務已接受，但自動審核失敗，請稍後重試。"
        : `Mission accepted but auto-approval failed: ${autoApproveError.message}`,
    };
    await finalizeIdempotentOperation({
      storageKey: operation.storageKey,
      ttlMs: operation.ttlMs,
      status: 400,
      body: errorBody,
    });

    return NextResponse.json(errorBody, { status: 400 });
  }

  await admin.rpc("settle_referral_reward", {
    approved_submission_id_input: submissionCreated.id,
  });

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
      submissionId: submissionCreated.id,
      autoSubmission: true,
    },
  });

  await createAppLog({
    level: "info",
    category: "funnel",
    event: "funnel.submission_approved",
    route: "/api/missions/[slug]/interest",
    userId: user?.id ?? null,
    context: {
      missionSlug: slug,
      method: request.method,
      channel: "web",
      submissionId: submissionCreated.id,
      autoApproved: true,
    },
  });

  const successBody = { ok: true, count: nextCount, submissionId: submissionCreated.id, autoDetected: true };
  await finalizeIdempotentOperation({
    storageKey: operation.storageKey,
    ttlMs: operation.ttlMs,
    status: 200,
    body: successBody,
  });

  return NextResponse.json(successBody);
}
