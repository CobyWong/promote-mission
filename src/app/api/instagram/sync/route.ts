import { NextResponse } from "next/server";

import {
  fetchRecentReelsInsights,
  normalizeInstagramPermalink,
} from "@/lib/instagram";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SubmissionRef = Pick<
  Database["public"]["Tables"]["submissions"]["Row"],
  "id" | "reel_url"
>;

export async function POST() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const { data: connectionData, error: connectionError } = await supabase
    .from("instagram_connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (connectionError) {
    return NextResponse.json({ error: connectionError.message }, { status: 400 });
  }

  if (!connectionData) {
    return NextResponse.json({ error: "Instagram account is not connected." }, { status: 400 });
  }

  try {
    const reels = await fetchRecentReelsInsights(connectionData.instagram_user_id, connectionData.access_token);

    const { data: submissionsData } = await supabase
      .from("submissions")
      .select("id, reel_url")
      .eq("user_id", user.id);

    const submissions = (submissionsData ?? []) as SubmissionRef[];
    const submissionByUrl = new Map<string, string>(
      submissions.map((item) => [normalizeInstagramPermalink(item.reel_url), item.id]),
    );

    const today = new Date().toISOString().slice(0, 10);

    const rows: Database["public"]["Tables"]["reel_insights"]["Insert"][] = reels.map((reel) => ({
      user_id: user.id,
      submission_id: submissionByUrl.get(normalizeInstagramPermalink(reel.permalink)) ?? null,
      media_id: reel.mediaId,
      reel_url: reel.permalink,
      metric_date: today,
      plays: reel.metrics.plays ?? 0,
      reach: reel.metrics.reach ?? 0,
      likes: reel.metrics.likes ?? 0,
      comments: reel.metrics.comments ?? 0,
      shares: reel.metrics.shares ?? 0,
      saves: reel.metrics.saved ?? 0,
      total_interactions: reel.metrics.total_interactions ?? 0,
      raw_metrics: reel.metrics,
    }));

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from("reel_insights")
        .upsert(rows, { onConflict: "user_id,media_id,metric_date" });

      if (upsertError) {
        throw new Error(upsertError.message);
      }
    }

    const { error: updateError } = await supabase
      .from("instagram_connections")
      .update({
        last_synced_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("user_id", user.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({ synced: rows.length }, { status: 200 });
  } catch (error) {
    await supabase
      .from("instagram_connections")
      .update({
        last_error: error instanceof Error ? error.message : "Instagram sync failed.",
      })
      .eq("user_id", user.id);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Instagram sync failed.",
      },
      { status: 400 },
    );
  }
}
