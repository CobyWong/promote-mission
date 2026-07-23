import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";
import {
  fetchRecentReelsInsights,
  hasMissionOneCollaborator,
  normalizeInstagramPermalink,
} from "@/lib/instagram";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SubmissionRef = Pick<
  Database["public"]["Tables"]["submissions"]["Row"],
  "id" | "reel_url" | "status" | "checklist" | "submitted_at"
>;

export async function POST(request: Request) {
  const isZh = isZhRequest(request);
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ error: isZh ? "Instagram 同步服務暫時不可用，請稍後再試。" : "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: isZh ? "請先登入後再同步 Instagram。" : "Please log in first." }, { status: 401 });
  }

  const { data: connectionData, error: connectionError } = await supabase
    .from("instagram_connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (connectionError) {
    return NextResponse.json({ error: isZh ? "讀取 Instagram 連線狀態失敗，請稍後再試。" : connectionError.message }, { status: 400 });
  }

  if (!connectionData) {
    return NextResponse.json({ error: isZh ? "尚未連接 Instagram 帳戶。" : "Instagram account is not connected." }, { status: 400 });
  }

  try {
    const reels = await fetchRecentReelsInsights(connectionData.instagram_user_id, connectionData.access_token);

    const { data: submissionsData } = await supabase
      .from("submissions")
      .select("id, reel_url, status, checklist, submitted_at")
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
      raw_metrics: {
        ...reel.metrics,
        caption: reel.caption ?? "",
        published_at: reel.publishedAt ?? null,
        hasMissionOneCollaborator: hasMissionOneCollaborator(reel.caption),
      },
    }));

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from("reel_insights")
        .upsert(rows, { onConflict: "user_id,media_id,metric_date" });

      if (upsertError) {
        throw new Error(upsertError.message);
      }
    }

    let autoSettled = 0;

    if (admin) {
      const pendingAwaiting = submissions
        .filter((item) => item.status === "Pending")
        .filter((item) => {
          const checklist = (item.checklist ?? null) as Record<string, unknown> | null;
          return checklist?.awaitingCollaborator === true;
        })
        .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());

      if (pendingAwaiting.length > 0) {
        const usedNormalizedUrls = new Set(
          submissions
            .filter((item) => !item.reel_url.startsWith("pending://"))
            .map((item) => normalizeInstagramPermalink(item.reel_url)),
        );

        const candidateReels: string[] = [];
        const seenCandidate = new Set<string>();

        for (const reel of reels) {
          if (!hasMissionOneCollaborator(reel.caption)) {
            continue;
          }

          const normalized = normalizeInstagramPermalink(reel.permalink);
          if (seenCandidate.has(normalized) || usedNormalizedUrls.has(normalized)) {
            continue;
          }

          seenCandidate.add(normalized);
          candidateReels.push(reel.permalink);
        }

        for (const pending of pendingAwaiting) {
          const reelUrl = candidateReels.shift();
          if (!reelUrl) {
            break;
          }

          const { error: updateError } = await admin
            .from("submissions")
            .update({
              reel_url: reelUrl,
              notes: isZh
                ? "Instagram 同步已檢測到 @missionone_hk 協作者，系統自動完成提交。"
                : "Instagram sync detected @missionone_hk collaborator and auto-completed submission.",
              checklist: {
                addedCollaborator: true,
                autoDetectedByInstagramSync: true,
                awaitingCollaborator: false,
              },
            })
            .eq("id", pending.id)
            .eq("user_id", user.id);

          if (updateError) {
            continue;
          }

          const { error: approveError } = await admin.rpc("approve_submission", {
            submission_id_input: pending.id,
            reviewer_id_input: null,
            review_notes_input: isZh
              ? "系統已根據 Instagram 同步協作者資料自動審核通過。"
              : "Auto-approved from Instagram sync collaborator detection.",
          });

          if (approveError) {
            continue;
          }

          await admin.rpc("settle_referral_reward", {
            approved_submission_id_input: pending.id,
          });

          autoSettled += 1;
        }
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

    return NextResponse.json({ synced: rows.length, autoSettled }, { status: 200 });
  } catch (error) {
    await supabase
      .from("instagram_connections")
      .update({
        last_error: error instanceof Error ? error.message : "Instagram sync failed.",
      })
      .eq("user_id", user.id);

    return NextResponse.json(
      {
        error: isZh
          ? "Instagram 同步失敗，請稍後再試。"
          : (error instanceof Error ? error.message : "Instagram sync failed."),
      },
      { status: 400 },
    );
  }
}
