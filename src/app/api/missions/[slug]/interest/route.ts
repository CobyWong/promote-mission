import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";
import { isSameOriginMutationRequest } from "@/lib/csrf";
import { beginIdempotentOperation, finalizeIdempotentOperation } from "@/lib/idempotency";
import { syncMissionOneSubmissionsForUser } from "@/lib/instagram-system-sync";
import { captionHasMissionTag, getRequiredMissionCaptionTag } from "@/lib/mission-caption-tag";
import { isMissionOpenForApplications } from "@/lib/mission-lifecycle";
import { getMissionRewardCoins } from "@/lib/mission-rules";
import { createAppLog } from "@/lib/observability";
import { evaluateRateLimit, getClientFingerprint, getRetryAfterSeconds } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminConfig, hasSupabaseConfig } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getCaptionFromRawMetrics(rawMetrics: unknown) {
  if (!rawMetrics || typeof rawMetrics !== "object") {
    return null;
  }

  const caption = (rawMetrics as Record<string, unknown>).caption;
  return typeof caption === "string" ? caption : null;
}

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

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, instagram_handle")
    .eq("id", user.id)
    .maybeSingle();

  const normalizedInstagramHandle = String(profile?.instagram_handle ?? "")
    .trim()
    .replace(/^@/, "");

  if (!/^[a-zA-Z0-9._]{1,30}$/.test(normalizedInstagramHandle)) {
    const errorBody = {
      error: isZh
        ? "請先在個人資料填寫有效的公開 Instagram 帳號，再接受任務。"
        : "Please set a valid public Instagram username in your profile before accepting missions.",
    };
    await finalizeIdempotentOperation({
      storageKey: operation.storageKey,
      ttlMs: operation.ttlMs,
      status: 400,
      body: errorBody,
    });
    return NextResponse.json(errorBody, { status: 400 });
  }

  const { data: mission } = await admin
    .from("missions")
    .select("slug, title, brand, difficulty, current_participants, status, starts_at, ends_at, tags")
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

  const requiredCaptionTag = getRequiredMissionCaptionTag(mission.tags);
  if (!requiredCaptionTag) {
    const errorBody = {
      error: isZh
        ? "此任務尚未設定分類標籤，暫時不能申請。"
        : "This mission is missing its required classification hashtag and is not ready for applications.",
    };
    await finalizeIdempotentOperation({
      storageKey: operation.storageKey,
      ttlMs: operation.ttlMs,
      status: 409,
      body: errorBody,
    });
    return NextResponse.json(errorBody, { status: 409 });
  }

  try {
    await syncMissionOneSubmissionsForUser({
      admin,
      userId: user.id,
      locale: isZh ? "zh-HK" : "en",
    });
  } catch {
    // Accept flow remains available even if system sync is temporarily unavailable.
  }

  const { data: existingSubmission } = await admin
    .from("submissions")
    .select("id, status, checklist")
    .eq("user_id", user.id)
    .eq("mission_slug", slug)
    .in("status", ["Pending", "Approved"])
    .maybeSingle();

  if (existingSubmission) {
    const checklist = (existingSubmission.checklist ?? null) as Record<string, unknown> | null;
    const awaitingCollaborator = existingSubmission.status === "Pending" && checklist?.awaitingCollaborator === true;

    if (!awaitingCollaborator) {
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
      .select("reel_url, metric_date, created_at, raw_metrics")
      .eq("user_id", user.id)
      .contains("raw_metrics", { hasMissionOneCollaborator: true })
      .order("metric_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(25);

    const matchedReel = (latestCollaboratorReel ?? []).find((item) =>
      captionHasMissionTag(getCaptionFromRawMetrics(item.raw_metrics), requiredCaptionTag),
    );

    if (!matchedReel?.reel_url) {
      const captionTagHint = requiredCaptionTag ? (isZh ? `，並在 Caption 加上 ${requiredCaptionTag}` : ` and include ${requiredCaptionTag} in the caption`) : "";
      const successBody = {
        ok: true,
        count: mission.current_participants ?? 0,
        submissionId: existingSubmission.id,
        awaitingCollaborator: true,
        requiredCaptionTag,
        message: isZh
        ? `已接受任務。請先發佈 Reels 並加入 @missionone_hk 協作者${captionTagHint}；系統會從 missionone_hk 自動同步並按標籤完成分類與審核。`
        : `Mission accepted. Publish your Reel with @missionone_hk as collaborator${captionTagHint}. MissionOne will sync missionone_hk automatically, classify by mission hashtag, and complete review.`,
      };
      await finalizeIdempotentOperation({
        storageKey: operation.storageKey,
        ttlMs: operation.ttlMs,
        status: 200,
        body: successBody,
      });

      return NextResponse.json(successBody);
    }

    const { error: updateSubmissionError } = await admin
      .from("submissions")
      .update({
        reel_url: matchedReel.reel_url,
        notes: isZh
          ? "系統已自動匹配 missionone_hk 協作 Reels，並按任務標籤完成分類。"
          : "Auto-matched Reel from missionone_hk collaborator feed and classified by mission hashtag.",
        checklist: {
          addedCollaborator: true,
          autoDetectedByInstagramSync: true,
          awaitingCollaborator: false,
        },
      })
      .eq("id", existingSubmission.id);

    if (updateSubmissionError) {
      const errorBody = {
        error: isZh
          ? "任務已接受，但更新 Reels 提交資料失敗，請稍後重試。"
          : `Mission accepted but failed to update synced Reel: ${updateSubmissionError.message}`,
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
      submission_id_input: existingSubmission.id,
      reviewer_id_input: null,
      review_notes_input: isZh
        ? "系統已根據 missionone_hk 同步與任務標籤自動審核通過。"
        : "Auto-approved from missionone_hk sync and mission hashtag classification.",
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
      approved_submission_id_input: existingSubmission.id,
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
        submissionId: existingSubmission.id,
        autoApproved: true,
      },
    });

    const successBody = {
      ok: true,
      count: mission.current_participants ?? 0,
      submissionId: existingSubmission.id,
      autoDetected: true,
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
    .select("reel_url, metric_date, created_at, raw_metrics")
    .eq("user_id", user.id)
    .contains("raw_metrics", { hasMissionOneCollaborator: true })
    .order("metric_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(25);

  const matchedReel = (latestCollaboratorReel ?? []).find((item) =>
    captionHasMissionTag(getCaptionFromRawMetrics(item.raw_metrics), requiredCaptionTag),
  );

  if (!matchedReel?.reel_url) {
    const { data: placeholderSubmission, error: placeholderError } = await admin
      .from("submissions")
      .insert({
        user_id: user.id,
        mission_slug: mission.slug,
        mission_title: mission.title,
        mission_brand: mission.brand,
        reward_coins: getMissionRewardCoins(mission.difficulty ?? "Easy"),
        reel_url: `pending://awaiting-collaborator/${mission.slug}`,
        caption_summary: null,
        notes: isZh
          ? "已接受任務，等待同步含 @missionone_hk 協作者的 Reels。"
          : "Mission accepted, waiting for synced Reel with @missionone_hk collaborator.",
        checklist: {
          awaitingCollaborator: true,
          addedCollaborator: false,
          autoDetectedByInstagramSync: false,
        },
        screenshot_count: 0,
        screenshot_paths: [],
        creator_name: profile?.full_name ?? user.email ?? "Creator",
        creator_handle: profile?.instagram_handle ?? null,
        status: "Pending",
      })
      .select("id")
      .single();

    if (placeholderError || !placeholderSubmission?.id) {
      const errorBody = {
        error: isZh
          ? "任務接受成功，但建立進行中狀態失敗，請稍後重試。"
          : `Mission accepted but failed to create active mission placeholder: ${placeholderError?.message ?? "unknown error"}`,
      };
      await finalizeIdempotentOperation({
        storageKey: operation.storageKey,
        ttlMs: operation.ttlMs,
        status: 400,
        body: errorBody,
      });

      return NextResponse.json(errorBody, { status: 400 });
    }

    const nextCount = (mission?.current_participants ?? 0) + 1;

    const { error: updateMissionError } = await admin
      .from("missions")
      .update({ current_participants: nextCount })
      .eq("slug", slug);

    if (updateMissionError) {
      const errorBody = { error: isZh ? "更新任務參與人數失敗，請稍後再試。" : updateMissionError.message };
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
        submissionId: placeholderSubmission.id,
        awaitingCollaborator: true,
      },
    });

    const successBody = {
      ok: true,
      count: nextCount,
      submissionId: placeholderSubmission.id,
      awaitingCollaborator: true,
      requiredCaptionTag,
      message: isZh
        ? `已接受任務。請先發佈 Reels 並加入 @missionone_hk 協作者，並在 Caption 加上 ${requiredCaptionTag}；系統會從 missionone_hk 自動同步並按標籤完成分類與審核。`
        : `Mission accepted. Publish your Reel with @missionone_hk as collaborator and include ${requiredCaptionTag} in the caption. MissionOne will sync missionone_hk automatically, classify by mission hashtag, and complete review.`,
    };
    await finalizeIdempotentOperation({
      storageKey: operation.storageKey,
      ttlMs: operation.ttlMs,
      status: 200,
      body: successBody,
    });

    return NextResponse.json(successBody);
  }

  const { data: submissionCreated, error: submissionError } = await admin
    .from("submissions")
    .insert({
      user_id: user.id,
      mission_slug: mission.slug,
      mission_title: mission.title,
      mission_brand: mission.brand,
      reward_coins: getMissionRewardCoins(mission.difficulty ?? "Easy"),
      reel_url: matchedReel.reel_url,
      caption_summary: null,
      notes: isZh
        ? "系統已自動匹配 missionone_hk 協作 Reels，並按任務標籤完成分類。"
        : "Auto-matched Reel from missionone_hk collaborator feed and classified by mission hashtag.",
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
      ? "系統已根據 missionone_hk 同步與任務標籤自動審核通過。"
      : "Auto-approved from missionone_hk sync and mission hashtag classification.",
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
