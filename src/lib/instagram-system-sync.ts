import type { SupabaseClient } from "@supabase/supabase-js";

import { captionHasMissionTag, getRequiredMissionCaptionTag } from "@/lib/mission-caption-tag";
import {
  fetchRecentReelsInsights,
  normalizeInstagramPermalink,
  type InstagramReelInsight,
} from "@/lib/instagram";
import type { Database } from "@/lib/supabase/database.types";

type SubmissionSyncRow = Pick<
  Database["public"]["Tables"]["submissions"]["Row"],
  "id" | "user_id" | "reel_url" | "status" | "checklist" | "mission_slug" | "creator_handle" | "submitted_at"
>;

type MissionTagRef = Pick<
  Database["public"]["Tables"]["missions"]["Row"],
  "slug" | "tags"
>;

type SyncSource = "env" | "table";

type MissionOneSystemAccount = {
  source: SyncSource;
  instagramUserId: string;
  accessToken: string;
  connectionUserId: string | null;
};

export type MissionOneSyncResult = {
  source: SyncSource;
  missionOneMediaScanned: number;
  insightsUpserted: number;
  matchedSubmissions: number;
  autoSettled: number;
  pendingNeedsManualSubmission: number;
  pendingMissingRequiredTag: number;
};

type MissionOneSharedSyncContext = {
  account: MissionOneSystemAccount;
  reels: InstagramReelInsight[];
};

type SyncMissionOneSubmissionsForUserOptions = {
  admin: SupabaseClient<Database>;
  userId: string;
  locale: "en" | "zh-HK";
  sharedContext?: MissionOneSharedSyncContext;
};

export type MissionOneBatchSyncResult = {
  source: SyncSource;
  usersProcessed: number;
  usersFailed: number;
  failedUserIds: string[];
  missionOneMediaScanned: number;
  insightsUpserted: number;
  matchedSubmissions: number;
  autoSettled: number;
  pendingNeedsManualSubmission: number;
  pendingMissingRequiredTag: number;
};

function normalizeInstagramHandle(rawHandle: string | null | undefined) {
  const value = (rawHandle ?? "").trim().replace(/^@+/, "").toLowerCase();
  return value || null;
}

function escapeRegExp(raw: string) {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function captionMentionsHandle(caption: string | null | undefined, handle: string | null | undefined) {
  if (!caption) {
    return false;
  }

  const normalizedHandle = normalizeInstagramHandle(handle);
  if (!normalizedHandle) {
    return false;
  }

  const mentionPattern = new RegExp(`(^|[^a-zA-Z0-9._])@${escapeRegExp(normalizedHandle)}\\b`, "i");
  return mentionPattern.test(caption);
}

function toComparableTimestamp(value: string | null | undefined) {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : Number.NEGATIVE_INFINITY;
}

function getMissionOneSystemAccountFromEnv(): MissionOneSystemAccount | null {
  const instagramUserId = (process.env.MISSIONONE_INSTAGRAM_USER_ID ?? "").trim();
  const accessToken = (process.env.MISSIONONE_INSTAGRAM_ACCESS_TOKEN ?? "").trim();

  if (!instagramUserId || !accessToken) {
    return null;
  }

  return {
    source: "env",
    instagramUserId,
    accessToken,
    connectionUserId: null,
  };
}

async function getMissionOneSystemAccountFromTable(admin: SupabaseClient<Database>) {
  const usernameMatch = await admin
    .from("instagram_connections")
    .select("user_id, instagram_user_id, access_token")
    .eq("status", "active")
    .ilike("instagram_username", "missionone_hk")
    .limit(1)
    .maybeSingle();

  if (usernameMatch.data?.instagram_user_id && usernameMatch.data.access_token) {
    return {
      source: "table" as const,
      instagramUserId: usernameMatch.data.instagram_user_id,
      accessToken: usernameMatch.data.access_token,
      connectionUserId: usernameMatch.data.user_id,
    };
  }

  const pageNameMatch = await admin
    .from("instagram_connections")
    .select("user_id, instagram_user_id, access_token")
    .eq("status", "active")
    .ilike("facebook_page_name", "%missionone%")
    .limit(1)
    .maybeSingle();

  if (pageNameMatch.data?.instagram_user_id && pageNameMatch.data.access_token) {
    return {
      source: "table" as const,
      instagramUserId: pageNameMatch.data.instagram_user_id,
      accessToken: pageNameMatch.data.access_token,
      connectionUserId: pageNameMatch.data.user_id,
    };
  }

  return null;
}

async function resolveMissionOneSystemAccount(admin: SupabaseClient<Database>) {
  const envConfig = getMissionOneSystemAccountFromEnv();
  if (envConfig) {
    return envConfig;
  }

  const tableConfig = await getMissionOneSystemAccountFromTable(admin);
  if (tableConfig) {
    return tableConfig;
  }

  throw new Error(
    "MissionOne Instagram system account is not configured. Set MISSIONONE_INSTAGRAM_USER_ID and MISSIONONE_INSTAGRAM_ACCESS_TOKEN, or connect missionone_hk as an active instagram_connection.",
  );
}

function mergeChecklistForAutoSync(checklist: unknown) {
  const base = checklist && typeof checklist === "object" && !Array.isArray(checklist)
    ? { ...(checklist as Record<string, unknown>) }
    : {};

  return {
    ...base,
    addedCollaborator: true,
    autoDetectedByInstagramSync: true,
    awaitingCollaborator: false,
  };
}

async function updateSystemSyncStatus(
  admin: SupabaseClient<Database>,
  account: MissionOneSystemAccount,
  patch: { last_synced_at?: string; last_error?: string | null },
) {
  if (account.source !== "table" || !account.connectionUserId) {
    return;
  }

  await admin
    .from("instagram_connections")
    .update(patch)
    .eq("user_id", account.connectionUserId)
    .eq("instagram_user_id", account.instagramUserId);
}

export async function syncMissionOneSubmissionsForUser(options: SyncMissionOneSubmissionsForUserOptions) {
  const { admin, userId, locale } = options;
  const isZh = locale !== "en";
  let missionOneAccount: MissionOneSystemAccount | null = null;

  try {
    missionOneAccount = options.sharedContext?.account ?? await resolveMissionOneSystemAccount(admin);

    const { data: submissionsData, error: submissionsError } = await admin
      .from("submissions")
      .select("id, user_id, reel_url, status, checklist, mission_slug, creator_handle, submitted_at")
      .eq("user_id", userId)
      .in("status", ["Pending", "Approved"]);

    if (submissionsError) {
      throw new Error(submissionsError.message);
    }

    const submissions = (submissionsData ?? []) as SubmissionSyncRow[];
    if (submissions.length === 0) {
      await updateSystemSyncStatus(admin, missionOneAccount, {
        last_synced_at: new Date().toISOString(),
        last_error: null,
      });

      return {
        source: missionOneAccount.source,
        missionOneMediaScanned: options.sharedContext?.reels.length ?? 0,
        insightsUpserted: 0,
        matchedSubmissions: 0,
        autoSettled: 0,
        pendingNeedsManualSubmission: 0,
        pendingMissingRequiredTag: 0,
      } satisfies MissionOneSyncResult;
    }

    const pendingSubmissions = submissions.filter((item) => item.status === "Pending");

    const pendingMissionSlugs = Array.from(
      new Set(pendingSubmissions.map((item) => item.mission_slug)),
    );

    const requiredTagByMissionSlug = new Map<string, string | null>();

    if (pendingMissionSlugs.length > 0) {
      const { data: missionData } = await admin
        .from("missions")
        .select("slug, tags")
        .in("slug", pendingMissionSlugs);

      const missionRows = (missionData ?? []) as MissionTagRef[];
      missionRows.forEach((mission) => {
        requiredTagByMissionSlug.set(mission.slug, getRequiredMissionCaptionTag(mission.tags));
      });
    }

    const reels = options.sharedContext?.reels ?? await fetchRecentReelsInsights(
      missionOneAccount.instagramUserId,
      missionOneAccount.accessToken,
    );

    const normalizedPermalinks = reels.map((reel) => normalizeInstagramPermalink(reel.permalink));
    const reelClaimedByOtherUser = new Set<string>();

    if (normalizedPermalinks.length > 0) {
      const { data: claimedReels } = await admin
        .from("reel_insights")
        .select("reel_url, user_id")
        .in("reel_url", normalizedPermalinks);

      (claimedReels ?? []).forEach((row) => {
        if (row.user_id && row.user_id !== userId) {
          reelClaimedByOtherUser.add(normalizeInstagramPermalink(row.reel_url));
        }
      });
    }

    const reelsByPermalink = new Map(
      reels.map((reel) => [normalizeInstagramPermalink(reel.permalink), reel]),
    );

    const matchedPairs: Array<{ submission: SubmissionSyncRow; reel: (typeof reels)[number] }> = [];
    const usedMediaIds = new Set<string>();

    for (const submission of submissions) {
      if (!submission.reel_url.startsWith("http")) {
        continue;
      }

      const normalizedUrl = normalizeInstagramPermalink(submission.reel_url);
      const reel = reelsByPermalink.get(normalizedUrl);
      if (!reel || reelClaimedByOtherUser.has(normalizedUrl)) {
        continue;
      }

      matchedPairs.push({ submission, reel });
      usedMediaIds.add(reel.mediaId);
    }

    for (const submission of pendingSubmissions) {
      if (matchedPairs.some((pair) => pair.submission.id === submission.id)) {
        continue;
      }

      const requiredTag = requiredTagByMissionSlug.get(submission.mission_slug) ?? null;
      if (!requiredTag) {
        continue;
      }

      const submissionTs = toComparableTimestamp(submission.submitted_at);
      const candidates = reels
        .filter((reel) => !usedMediaIds.has(reel.mediaId))
        .filter((reel) => !reelClaimedByOtherUser.has(normalizeInstagramPermalink(reel.permalink)))
        .filter((reel) => captionHasMissionTag(reel.caption, requiredTag))
        .filter((reel) => {
          const publishedTs = toComparableTimestamp(reel.publishedAt);
          return publishedTs >= submissionTs;
        });

      if (candidates.length === 0) {
        continue;
      }

      const handleMatchedCandidates = candidates.filter((reel) =>
        captionMentionsHandle(reel.caption, submission.creator_handle),
      );

      const selectedCandidate = handleMatchedCandidates[0] ?? (candidates.length === 1 ? candidates[0] : null);

      if (!selectedCandidate) {
        continue;
      }

      matchedPairs.push({ submission, reel: selectedCandidate });
      usedMediaIds.add(selectedCandidate.mediaId);
    }

    const today = new Date().toISOString().slice(0, 10);

    const insightRows: Database["public"]["Tables"]["reel_insights"]["Insert"][] = matchedPairs.map(({ submission, reel }) => ({
      user_id: userId,
      submission_id: submission.id,
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
        hasMissionOneCollaborator: true,
        matchedBy: "missionone_system_account",
      },
    }));

    if (insightRows.length > 0) {
      const { error: upsertError } = await admin
        .from("reel_insights")
        .upsert(insightRows, { onConflict: "user_id,media_id,metric_date" });

      if (upsertError) {
        throw new Error(upsertError.message);
      }
    }

    let autoSettled = 0;
    let pendingMissingRequiredTag = 0;

    for (const { submission, reel } of matchedPairs) {
      if (submission.status !== "Pending") {
        continue;
      }

      const requiredTag = requiredTagByMissionSlug.get(submission.mission_slug) ?? null;
      if (!requiredTag) {
        pendingMissingRequiredTag += 1;
        continue;
      }

      if (!captionHasMissionTag(reel.caption, requiredTag)) {
        pendingMissingRequiredTag += 1;
        continue;
      }

      const submissionUpdate: Database["public"]["Tables"]["submissions"]["Update"] = {
        reel_url: reel.permalink,
        notes: isZh
          ? "系統已透過 missionone_hk 同步到此 Reels，並自動完成提交與審核。"
          : "System synced this Reel via missionone_hk and auto-completed submission review.",
        checklist: mergeChecklistForAutoSync(submission.checklist),
      };

      const { error: updateError } = await admin
        .from("submissions")
        .update(submissionUpdate)
        .eq("id", submission.id)
        .eq("user_id", userId)
        .eq("status", "Pending");

      if (updateError) {
        continue;
      }

      const { error: approveError } = await admin.rpc("approve_submission", {
        submission_id_input: submission.id,
        reviewer_id_input: null,
        review_notes_input: isZh
          ? "系統已根據 missionone_hk 協作貼文同步結果自動審核通過。"
          : "Auto-approved from missionone_hk collaborator sync.",
      });

      if (approveError) {
        continue;
      }

      await admin.rpc("settle_referral_reward", {
        approved_submission_id_input: submission.id,
      });

      autoSettled += 1;
    }

    const pendingNeedsManualSubmission = Math.max(0, pendingSubmissions.length - autoSettled);

    await updateSystemSyncStatus(admin, missionOneAccount, {
      last_synced_at: new Date().toISOString(),
      last_error: null,
    });

    return {
      source: missionOneAccount.source,
      missionOneMediaScanned: reels.length,
      insightsUpserted: insightRows.length,
      matchedSubmissions: matchedPairs.length,
      autoSettled,
      pendingNeedsManualSubmission,
      pendingMissingRequiredTag,
    } satisfies MissionOneSyncResult;
  } catch (error) {
    if (missionOneAccount) {
      await updateSystemSyncStatus(admin, missionOneAccount, {
        last_error: error instanceof Error ? error.message : "missionone sync failed",
      });
    }

    throw error;
  }
}

export async function syncMissionOneSubmissionsForUsers(options: {
  admin: SupabaseClient<Database>;
  userIds: string[];
  locale: "en" | "zh-HK";
}) {
  const uniqueUserIds = Array.from(
    new Set(
      options.userIds
        .map((userId) => userId.trim())
        .filter((userId) => userId.length > 0),
    ),
  );

  const account = await resolveMissionOneSystemAccount(options.admin);

  if (uniqueUserIds.length === 0) {
    await updateSystemSyncStatus(options.admin, account, {
      last_synced_at: new Date().toISOString(),
      last_error: null,
    });

    return {
      source: account.source,
      usersProcessed: 0,
      usersFailed: 0,
      failedUserIds: [],
      missionOneMediaScanned: 0,
      insightsUpserted: 0,
      matchedSubmissions: 0,
      autoSettled: 0,
      pendingNeedsManualSubmission: 0,
      pendingMissingRequiredTag: 0,
    } satisfies MissionOneBatchSyncResult;
  }

  const reels = await fetchRecentReelsInsights(
    account.instagramUserId,
    account.accessToken,
  );

  const sharedContext: MissionOneSharedSyncContext = {
    account,
    reels,
  };

  const failedUserIds: string[] = [];
  let usersProcessed = 0;
  let insightsUpserted = 0;
  let matchedSubmissions = 0;
  let autoSettled = 0;
  let pendingNeedsManualSubmission = 0;
  let pendingMissingRequiredTag = 0;

  for (const userId of uniqueUserIds) {
    try {
      const result = await syncMissionOneSubmissionsForUser({
        admin: options.admin,
        userId,
        locale: options.locale,
        sharedContext,
      });

      usersProcessed += 1;
      insightsUpserted += result.insightsUpserted;
      matchedSubmissions += result.matchedSubmissions;
      autoSettled += result.autoSettled;
      pendingNeedsManualSubmission += result.pendingNeedsManualSubmission;
      pendingMissingRequiredTag += result.pendingMissingRequiredTag;
    } catch {
      failedUserIds.push(userId);
    }
  }

  await updateSystemSyncStatus(options.admin, account, {
    last_synced_at: new Date().toISOString(),
    last_error: failedUserIds.length > 0 ? `partial_failure:${failedUserIds.length}` : null,
  });

  return {
    source: account.source,
    usersProcessed,
    usersFailed: failedUserIds.length,
    failedUserIds,
    missionOneMediaScanned: reels.length,
    insightsUpserted,
    matchedSubmissions,
    autoSettled,
    pendingNeedsManualSubmission,
    pendingMissingRequiredTag,
  } satisfies MissionOneBatchSyncResult;
}
