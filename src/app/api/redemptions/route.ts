import { NextResponse } from "next/server";

import { createUserNotification } from "@/lib/notifications";
import { createAppLog } from "@/lib/observability";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
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

  const { data, error } = await supabase.rpc("redeem_reward", {
    reward_slug_input: rewardSlug,
  } satisfies Database["public"]["Functions"]["redeem_reward"]["Args"]);

  if (error) {
    await createAppLog({
      level: "error",
      category: "redemptions",
      event: "redeem_failed",
      message: error.message,
      route: "/api/redemptions",
      userId: user.id,
      context: { rewardSlug },
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
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

  return NextResponse.json({ redemptionId: data }, { status: 201 });
}
