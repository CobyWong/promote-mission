import { NextResponse } from "next/server";

import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ redemptionId: data }, { status: 201 });
}
