import { NextResponse } from "next/server";

import { createAppLog, reportApiError } from "@/lib/observability";
import { beginIdempotentOperation, finalizeIdempotentOperation } from "@/lib/idempotency";
import { getCreatorLevelFromTotalExp, getMissionRequiredLevel, getMissionRewardCoins, MAX_CREATOR_LEVEL } from "@/lib/mission-rules";
import { evaluateRateLimit, getClientFingerprint, getRetryAfterSeconds } from "@/lib/rate-limit";
import { isZhRequest } from "@/lib/api-locale";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SubmissionRequestBody = {
  slug?: string;
  reelUrl?: string;
  captionSummary?: string;
  notes?: string;
  checks?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const isZh = isZhRequest(request);
  const t = {
    rateLimited: isZh ? "提交次數過於頻繁，請稍後再試。" : "Too many submissions. Please wait and try again.",
    serviceUnavailable: isZh ? "提交服務暫時不可用，請稍後再試。" : "Supabase is not configured.",
    authRequired: isZh ? "請先登入後再提交 Proof。" : "Please log in before submitting proof.",
    missionNotFound: isZh ? "找不到此任務或任務已下架。" : "Mission not found.",
    levelRequired: (requiredLevel: number, creatorLevel: number) => isZh
      ? `此任務需達 Lv.${requiredLevel} 方可提交；你目前等級為 Lv.${creatorLevel}/${MAX_CREATOR_LEVEL}。`
      : `This mission requires level ${requiredLevel}. Your current level is ${creatorLevel}/${MAX_CREATOR_LEVEL}.`,
    invalidReelUrl: isZh ? "請提供有效的 Reels 連結。" : "A valid reel URL is required.",
    missingCollaborator: isZh
      ? "提交前請先將 @missionone_hk 設為協作者。"
      : "Please add @missionone_hk as collaborator before submission.",
    inflight: isZh
      ? "相同提交請求仍在處理中，請稍候再試。"
      : "A submission with the same idempotency key is already in progress.",
    unexpected: isZh ? "提交時發生未預期錯誤，請稍後再試。" : "Unexpected error while creating submission.",
  };

  try {
    const limiter = await evaluateRateLimit({
      namespace: "web-submission-create",
      key: getClientFingerprint(request),
      max: 20,
      windowMs: 60_000,
    });

    if (!limiter.allowed) {
      const retryAfter = getRetryAfterSeconds(limiter.resetAt);
      await createAppLog({
        level: "warn",
        category: "api",
        event: "web.submissions.rate_limited",
        message: "Web submission endpoint rate-limited.",
        route: "/api/submissions",
        requestId,
        context: { retryAfter },
      });
      return NextResponse.json(
        { error: t.rateLimited },
        {
          status: 429,
          headers: {
            "retry-after": String(retryAfter),
          },
        },
      );
    }

    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: t.serviceUnavailable }, { status: 503 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: t.authRequired }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    let slug = "";
    let reelUrl = "";
    let captionSummary: string | null = null;
    let notes: string | null = null;
    let checks: Record<string, boolean> = {};

    if (contentType.includes("application/json")) {
      const body = (await request.json().catch(() => null)) as SubmissionRequestBody | null;
      slug = String(body?.slug ?? "").trim();
      reelUrl = String(body?.reelUrl ?? "").trim();
      captionSummary = String(body?.captionSummary ?? "").trim() || null;
      notes = String(body?.notes ?? "").trim() || null;
      checks = (body?.checks ?? {}) as Record<string, boolean>;
    } else {
      const formData = await request.formData();
      slug = String(formData.get("slug") ?? "").trim();
      reelUrl = String(formData.get("reelUrl") ?? "").trim();
      captionSummary = String(formData.get("captionSummary") ?? "").trim() || null;
      notes = String(formData.get("notes") ?? "").trim() || null;
      const checksRaw = String(formData.get("checks") ?? "{}");
      checks = JSON.parse(checksRaw) as Record<string, boolean>;
    }

    const { data: missionRow } = await supabase
      .from("missions")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    const mission = missionRow
      ? {
          slug: missionRow.slug,
          title: missionRow.title,
          brand: missionRow.brand,
          points: getMissionRewardCoins(missionRow.difficulty ?? "Easy"),
          difficulty: missionRow.difficulty,
        }
      : null;

    if (!mission) {
      return NextResponse.json({ error: t.missionNotFound }, { status: 404 });
    }

    const { data: approvedSubmissions } = await supabase
      .from("submissions")
      .select("reward_coins")
      .eq("user_id", user.id)
      .eq("status", "Approved");

    const approvedExp = (approvedSubmissions ?? []).reduce((sum, item) => sum + Math.max(item.reward_coins ?? 0, 0), 0);
    const creatorLevel = getCreatorLevelFromTotalExp(approvedExp);
    const missionRequiredLevel = getMissionRequiredLevel(mission.difficulty ?? "Easy");

    if (creatorLevel < missionRequiredLevel) {
      return NextResponse.json(
        { error: t.levelRequired(missionRequiredLevel, creatorLevel) },
        { status: 403 },
      );
    }

    if (!reelUrl.startsWith("http")) {
      return NextResponse.json({ error: t.invalidReelUrl }, { status: 400 });
    }

    if (!checks.addedCollaborator) {
      return NextResponse.json({ error: t.missingCollaborator }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, instagram_handle")
      .eq("id", user.id)
      .maybeSingle();

    const profileRow = (profile ?? null) as Pick<
      Database["public"]["Tables"]["profiles"]["Row"],
      "full_name" | "instagram_handle"
    > | null;

    const submissionPayload: Database["public"]["Tables"]["submissions"]["Insert"] = {
      user_id: user.id,
      mission_slug: mission.slug,
      mission_title: mission.title,
      mission_brand: mission.brand,
      reward_coins: mission.points,
      reel_url: reelUrl,
      caption_summary: captionSummary,
      notes,
      checklist: checks,
      screenshot_count: 0,
      screenshot_paths: [],
      creator_name: profileRow?.full_name ?? user.email ?? "Creator",
      creator_handle: profileRow?.instagram_handle ?? null,
      status: "Pending",
    };

    const operation = await beginIdempotentOperation({
      namespace: "web-submission-create",
      actorId: user.id,
      request,
      fallbackSeed: `${user.id}:${mission.slug}:${reelUrl}:${captionSummary ?? ""}`,
      ttlMs: 2 * 60 * 1000,
    });

    if (operation.mode === "replay") {
      await createAppLog({
        level: "info",
        category: "api",
        event: "web.submissions.idempotency_replay",
        route: "/api/submissions",
        requestId,
        userId: user.id,
        context: {
          missionSlug: mission.slug,
          idempotencyKey: operation.idempotencyKey,
        },
      });
      return NextResponse.json(operation.body as Record<string, unknown>, { status: operation.status });
    }

    if (operation.mode === "inflight") {
      await createAppLog({
        level: "warn",
        category: "api",
        event: "web.submissions.idempotency_inflight",
        route: "/api/submissions",
        requestId,
        userId: user.id,
        context: {
          missionSlug: mission.slug,
          idempotencyKey: operation.idempotencyKey,
        },
      });
      return NextResponse.json(
        { error: t.inflight },
        { status: 409 },
      );
    }

    const { data, error } = await supabase
      .from("submissions")
      .insert(submissionPayload)
      .select("id")
      .single();

    if (error) {
      const errorBody = { error: error.message };
      await finalizeIdempotentOperation({
        storageKey: operation.storageKey,
        ttlMs: operation.ttlMs,
        status: 400,
        body: errorBody,
      });
      return NextResponse.json(errorBody, { status: 400 });
    }

    const successBody = { id: (data as { id: string }).id };
    await createAppLog({
      level: "info",
      category: "funnel",
      event: "funnel.submission_created",
      route: "/api/submissions",
      requestId,
      userId: user.id,
      context: {
        missionSlug: mission.slug,
        submissionId: successBody.id,
        channel: "web",
      },
    });

    await finalizeIdempotentOperation({
      storageKey: operation.storageKey,
      ttlMs: operation.ttlMs,
      status: 201,
      body: successBody,
    });

    return NextResponse.json(successBody, { status: 201 });
  } catch (error) {
    await reportApiError({
      route: "/api/submissions",
      request,
      requestId,
      error,
      context: {
        handler: "POST",
      },
    });

    return NextResponse.json({ error: t.unexpected }, { status: 500 });
  }
}
