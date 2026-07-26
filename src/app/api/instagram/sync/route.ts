import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";
import { captionHasMissionTag, getRequiredMissionCaptionTag } from "@/lib/mission-caption-tag";
import {
  assertInstagramAccountIsPublic,
  fetchRecentReelsInsights,
  hasMissionOneCollaborator,
  InstagramPrivateAccountError,
  normalizeInstagramPermalink,
} from "@/lib/instagram";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SubmissionRef = Pick<
  Database["public"]["Tables"]["submissions"]["Row"],
  "id" | "reel_url" | "status" | "checklist" | "submitted_at" | "mission_slug"
>;

type ProfileRef = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "full_name" | "instagram_handle"
>;

type MissionTagRef = Pick<
  Database["public"]["Tables"]["missions"]["Row"],
  "slug" | "tags"
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
    await assertInstagramAccountIsPublic(connectionData.instagram_user_id, connectionData.access_token);
    const reels = await fetchRecentReelsInsights(connectionData.instagram_user_id, connectionData.access_token);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, instagram_handle")
      .eq("id", user.id)
      .maybeSingle();

    const profile = (profileData ?? null) as ProfileRef | null;

    const { data: submissionsData } = await supabase
      .from("submissions")
      .select("id, reel_url, status, checklist, submitted_at, mission_slug")
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
        const pendingMissionSlugs = Array.from(new Set(pendingAwaiting.map((item) => item.mission_slug)));
        const { data: missionData } = await supabase
          .from("missions")
          .select("slug, tags")
          .in("slug", pendingMissionSlugs);

        const missionRows = (missionData ?? []) as MissionTagRef[];
        const requiredTagByMissionSlug = new Map(
          missionRows.map((item) => [item.slug, getRequiredMissionCaptionTag(item.tags)]),
        );

        const usedNormalizedUrls = new Set(
          submissions
            .filter((item) => !item.reel_url.startsWith("pending://"))
            .map((item) => normalizeInstagramPermalink(item.reel_url)),
        );

        const availableReels = reels
          .filter((reel) => hasMissionOneCollaborator(reel.caption))
          .map((reel) => ({
            permalink: reel.permalink,
            caption: reel.caption,
            normalizedUrl: normalizeInstagramPermalink(reel.permalink),
          }))
          .filter((reel) => !usedNormalizedUrls.has(reel.normalizedUrl));

        const usedCandidateUrls = new Set<string>();

        const pendingOrdered = [...pendingAwaiting].sort((a, b) => {
          const aHasRequiredTag = Boolean(requiredTagByMissionSlug.get(a.mission_slug));
          const bHasRequiredTag = Boolean(requiredTagByMissionSlug.get(b.mission_slug));
          return Number(bHasRequiredTag) - Number(aHasRequiredTag);
        });

        for (const pending of pendingOrdered) {
          const requiredTag = requiredTagByMissionSlug.get(pending.mission_slug) ?? null;
          const matchedReel = availableReels.find((reel) => (
            !usedCandidateUrls.has(reel.normalizedUrl)
            && captionHasMissionTag(reel.caption, requiredTag)
          ));

          if (!matchedReel) {
            continue;
          }

          usedCandidateUrls.add(matchedReel.normalizedUrl);

          const submissionUpdate: Database["public"]["Tables"]["submissions"]["Update"] = {
            reel_url: matchedReel.permalink,
            notes: isZh
              ? "Instagram 同步已檢測到 @missionone_hk 協作者，系統自動完成提交。"
              : "Instagram sync detected @missionone_hk collaborator and auto-completed submission.",
            checklist: {
              addedCollaborator: true,
              autoDetectedByInstagramSync: true,
              awaitingCollaborator: false,
            },
          };

          const normalizedHandle = profile?.instagram_handle?.trim() ?? "";
          const normalizedName = profile?.full_name?.trim() ?? "";

          if (normalizedHandle.length > 0) {
            submissionUpdate.creator_handle = normalizedHandle;
          }

          if (normalizedName.length > 0) {
            submissionUpdate.creator_name = normalizedName;
          }

          const { error: updateError } = await admin
            .from("submissions")
            .update(submissionUpdate)
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
    if (error instanceof InstagramPrivateAccountError) {
      await supabase
        .from("instagram_connections")
        .update({
          last_error: error.message,
        })
        .eq("user_id", user.id);

      return NextResponse.json(
        {
          error: isZh
            ? "Instagram 帳號目前為私人帳號。請先切換為公開帳號，才可同步 Reels 的播放與讚好數據。"
            : "Your Instagram account is private. Please switch it to public before syncing reel views/likes.",
        },
        { status: 409 },
      );
    }

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
