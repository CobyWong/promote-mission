import { NextResponse } from "next/server";

import { missions } from "@/lib/data";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCreatorLevelFromTotalExp, getMissionRequiredLevel, MAX_CREATOR_LEVEL } from "@/lib/mission-rules";
import { evaluateRateLimit, getClientFingerprint, getRetryAfterSeconds } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limiter = evaluateRateLimit({
    namespace: "web-submission-create",
    key: getClientFingerprint(request),
    max: 20,
    windowMs: 60_000,
  });

  if (!limiter.allowed) {
    const retryAfter = getRetryAfterSeconds(limiter.resetAt);
    return NextResponse.json(
      { error: "Too many submissions. Please wait and try again." },
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
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please log in before submitting proof." }, { status: 401 });
  }

  const formData = await request.formData();
  const slug = String(formData.get("slug") ?? "");
  const reelUrl = String(formData.get("reelUrl") ?? "").trim();
  const captionSummary = String(formData.get("captionSummary") ?? "") || null;
  const notes = String(formData.get("notes") ?? "") || null;
  const checksRaw = String(formData.get("checks") ?? "{}");
  const checks = JSON.parse(checksRaw) as Record<string, boolean>;

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
        points: missionRow.reward_coins,
        difficulty: missionRow.difficulty,
      }
    : missions.find((item) => item.slug === slug);

  if (!mission) {
    return NextResponse.json({ error: "Mission not found." }, { status: 404 });
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
      { error: `This mission requires level ${missionRequiredLevel}. Your current level is ${creatorLevel}/${MAX_CREATOR_LEVEL}.` },
      { status: 403 },
    );
  }

  if (!reelUrl.startsWith("http")) {
    return NextResponse.json({ error: "A valid reel URL is required." }, { status: 400 });
  }

  if (!checks.addedCollaborator) {
    return NextResponse.json({ error: "Please add @missionone.hk as collaborator before submission." }, { status: 400 });
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

  const { data, error } = await supabase
    .from("submissions")
    .insert(submissionPayload)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 });
}
