import { NextResponse } from "next/server";

import { createUserNotification } from "@/lib/notifications";
import { createAppLog } from "@/lib/observability";
import { evaluateRateLimit, getClientFingerprint, getRetryAfterSeconds } from "@/lib/rate-limit";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCreatorLevelFromTotalExp, getRewardRequiredLevel, MAX_CREATOR_LEVEL } from "@/lib/mission-rules";
import { beginIdempotentOperation, finalizeIdempotentOperation } from "@/lib/idempotency";

export async function POST(request: Request) {
  const limiter = await evaluateRateLimit({
    namespace: "web-redemption-create",
    key: getClientFingerprint(request),
    max: 12,
    windowMs: 60_000,
  });

  if (!limiter.allowed) {
    const retryAfter = getRetryAfterSeconds(limiter.resetAt);
    await createAppLog({
      level: "warn",
      category: "api",
      event: "web.redemptions.rate_limited",
      message: "Redemption endpoint rate-limited.",
      route: "/api/redemptions",
      context: { retryAfter },
    });
    return NextResponse.json(
      { error: "Too many redemption attempts. Please try again shortly." },
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
    await createAppLog({
      level: "error",
      category: "redemptions",
      event: "redeem_unavailable",
      message: "Supabase is not configured.",
      route: "/api/redemptions",
    });
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await createAppLog({
      level: "warn",
      category: "auth",
      event: "redeem_unauthenticated",
      message: "Please log in before redeeming rewards.",
      route: "/api/redemptions",
    });
    return NextResponse.json({ error: "Please log in before redeeming rewards." }, { status: 401 });
  }

  const body = (await request.json()) as { rewardSlug?: string };
  const rewardSlug = String(body.rewardSlug ?? "").trim();

  if (!rewardSlug) {
    return NextResponse.json({ error: "Reward slug is required." }, { status: 400 });
  }

  const requiredLevel = getRewardRequiredLevel(rewardSlug);
  const { data: approvedSubmissions } = await supabase
    .from("submissions")
    .select("reward_coins")
    .eq("user_id", user.id)
    .eq("status", "Approved");
  const approvedExp = (approvedSubmissions ?? []).reduce((sum, item) => sum + Math.max(item.reward_coins ?? 0, 0), 0);
  const userLevel = getCreatorLevelFromTotalExp(approvedExp);

  if (userLevel < requiredLevel) {
    return NextResponse.json(
      { error: `This reward unlocks at level ${requiredLevel}. Your current level is ${userLevel}/${MAX_CREATOR_LEVEL}.` },
      { status: 403 },
    );
  }

  const operation = await beginIdempotentOperation({
    namespace: "web-redemption-create",
    actorId: user.id,
    request,
    fallbackSeed: `${user.id}:${rewardSlug}`,
    ttlMs: 2 * 60 * 1000,
  });

  if (operation.mode === "replay") {
    await createAppLog({
      level: "info",
      category: "api",
      event: "web.redemptions.idempotency_replay",
      route: "/api/redemptions",
      userId: user.id,
      context: {
        rewardSlug,
        idempotencyKey: operation.idempotencyKey,
      },
    });
    return NextResponse.json(operation.body as Record<string, unknown>, { status: operation.status });
  }

  if (operation.mode === "inflight") {
    await createAppLog({
      level: "warn",
      category: "api",
      event: "web.redemptions.idempotency_inflight",
      route: "/api/redemptions",
      userId: user.id,
      context: {
        rewardSlug,
        idempotencyKey: operation.idempotencyKey,
      },
    });
    return NextResponse.json(
      { error: "A redemption with the same idempotency key is already in progress." },
      { status: 409 },
    );
  }

  const { data, error } = await supabase.rpc("redeem_reward", {
    reward_slug_input: rewardSlug,
  } satisfies Database["public"]["Functions"]["redeem_reward"]["Args"]);

  if (error) {
    const errorBody = { error: error.message };
    await finalizeIdempotentOperation({
      storageKey: operation.storageKey,
      ttlMs: operation.ttlMs,
      status: 400,
      body: errorBody,
    });
    await createAppLog({
      level: "error",
      category: "redemptions",
      event: "redeem_failed",
      message: error.message,
      route: "/api/redemptions",
      userId: user.id,
      context: { rewardSlug },
    });
    return NextResponse.json(errorBody, { status: 400 });
  }

  const { data: redemptionRecord } = await supabase
    .from("reward_redemptions")
    .select("id, reward_name")
    .eq("id", data)
    .maybeSingle();

  await createUserNotification({
    userId: user.id,
    type: "redemption_requested",
    title: "Redemption submitted",
    message: `Your reward redemption request${redemptionRecord?.reward_name ? ` for \"${redemptionRecord.reward_name}\"` : ""} is now pending review.`,
    link: "/rewards",
    metadata: {
      redemptionId: data,
      rewardName: redemptionRecord?.reward_name ?? null,
    },
  });

  await createAppLog({
    level: "info",
    category: "redemptions",
    event: "redeem_requested",
    route: "/api/redemptions",
    userId: user.id,
    context: { rewardSlug, redemptionId: data },
  });

  const successBody = { redemptionId: data };
  await finalizeIdempotentOperation({
    storageKey: operation.storageKey,
    ttlMs: operation.ttlMs,
    status: 201,
    body: successBody,
  });

  return NextResponse.json(successBody, { status: 201 });
}
