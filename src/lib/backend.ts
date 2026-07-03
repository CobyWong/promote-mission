import { missions, rewards, sampleRewardRedemptions, leaders } from "@/lib/data";
import type { CreatorProfile, Leader, Mission, MissionRankingEntry, Reward, RewardRedemption, Submission } from "@/lib/data";
import { cache } from "react";
import { hasAdminSession } from "@/lib/admin-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { getAdminEmails, getBrandEmails, hasSupabaseAdminConfig, hasSupabaseConfig, isAdminEmail, isBrandOrAdminEmail } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCreatorLevelFromApprovedCount } from "@/lib/mission-rules";

const hiddenMissionSlugs = new Set([
  "spark-hydration-bottle",
  "fitbyte-protein-chips",
]);

const fallbackCreatorProfile: CreatorProfile = {
  name: "Chloe Wong",
  handle: "@chloe.creates",
  platform: "Instagram",
  niche: "Lifestyle / Beauty",
  followers: "12.8K",
  joinedAt: "May 2026",
};

type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];
type TransactionRow = Database["public"]["Tables"]["coin_transactions"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type MissionRow = Database["public"]["Tables"]["missions"]["Row"];
type RewardRow = Database["public"]["Tables"]["rewards_catalog"]["Row"];
type RewardRedemptionRow = Database["public"]["Tables"]["reward_redemptions"]["Row"];
type InstagramConnectionRow = Database["public"]["Tables"]["instagram_connections"]["Row"];
type ReelInsightRow = Database["public"]["Tables"]["reel_insights"]["Row"];
type SubmissionStatus = Submission["status"];

type AuthUserLike = {
  email?: string | null;
  created_at?: string;
  last_sign_in_at?: string | null;
  id?: string;
  user_metadata?: Record<string, unknown> | null;
};

export type AdminManagedUser = {
  id: string;
  email: string;
  fullName: string;
  instagramHandle: string;
  niche: string;
  followersRange: string;
  portfolioUrl: string;
  createdAt: string;
  lastSignInAt: string;
  isAdmin: boolean;
  isBrand: boolean;
};

function toMission(row: MissionRow): Mission {
  return {
    slug: row.slug,
    title: row.title,
    brand: row.brand,
    product: row.product,
    imageUrl: row.mission_image_url ?? undefined,
    points: row.reward_coins,
    difficulty: row.difficulty as Mission["difficulty"],
    eta: row.eta,
    category: row.category,
    description: row.description,
    hook: row.hook,
    requirements: row.requirements,
    deliverables: row.deliverables,
    tags: row.tags,
    displayOrder: row.display_order,
    isActive: row.is_active,
    minParticipants: row.min_participants,
    currentParticipants: row.current_participants,
  };
}

function toReward(row: RewardRow): Reward {
  return {
    slug: row.slug,
    name: row.name,
    cost: row.cost,
    badge: row.badge ?? undefined,
    description: row.description,
    eta: row.fulfillment_eta,
    stock: row.stock,
    displayOrder: row.display_order,
    isActive: row.is_active,
  };
}

function toRewardRedemption(row: RewardRedemptionRow): RewardRedemption {
  return {
    id: row.id,
    rewardSlug: row.reward_slug,
    rewardName: row.reward_name,
    costCoins: row.cost_coins,
    status: row.status as RewardRedemption["status"],
    createdAt: new Date(row.created_at).toLocaleString("zh-HK"),
    notes: row.notes ?? "",
  };
}

function toSubmission(row: SubmissionRow): Submission {
  return {
    id: row.id,
    creatorName: row.creator_name ?? "Unknown creator",
    missionSlug: row.mission_slug,
    missionTitle: row.mission_title,
    platform: "Instagram Reels",
    submittedAt: new Date(row.submitted_at).toLocaleString("zh-HK"),
    reelUrl: row.reel_url,
    screenshotCount: row.screenshot_count,
    status: row.status as SubmissionStatus,
    coins: row.reward_coins,
    notes: row.notes ?? "",
    screenshotPaths: Array.isArray(row.screenshot_paths) ? row.screenshot_paths.filter((item): item is string => typeof item === "string") : [],
  };
}

function withMissionRankings(baseMissions: Mission[], rankingMap: Map<string, MissionRankingEntry[]>) {
  return baseMissions.map((mission) => ({
    ...mission,
    rankings: rankingMap.get(mission.slug) ?? [],
  }));
}

async function getMissionRankingMap(missionSlugs: string[]) {
  if (!hasSupabaseAdminConfig()) {
    return new Map<string, MissionRankingEntry[]>();
  }

  const admin = createSupabaseAdminClient();

  if (!admin || missionSlugs.length === 0) {
    return new Map<string, MissionRankingEntry[]>();
  }

  const { data: submissionData } = await admin
    .from("submissions")
    .select("id, mission_slug, creator_handle, reel_url, status, submitted_at")
    .in("mission_slug", missionSlugs)
    .in("status", ["Pending", "Approved"]);

  const submissions = (submissionData ?? []) as Array<Pick<SubmissionRow, "id" | "mission_slug" | "creator_handle" | "reel_url" | "status" | "submitted_at">>;

  if (submissions.length === 0) {
    return new Map<string, MissionRankingEntry[]>();
  }

  const submissionIds = submissions.map((item) => item.id);

  const { data: insightData } = await admin
    .from("reel_insights")
    .select("submission_id, plays, metric_date, created_at")
    .in("submission_id", submissionIds);

  const insights = (insightData ?? []) as Array<Pick<ReelInsightRow, "submission_id" | "plays" | "metric_date" | "created_at">>;
  const latestInsightBySubmission = new Map<string, Pick<ReelInsightRow, "submission_id" | "plays" | "metric_date" | "created_at">>();

  for (const insight of insights) {
    if (!insight.submission_id) {
      continue;
    }

    const existing = latestInsightBySubmission.get(insight.submission_id);
    if (!existing) {
      latestInsightBySubmission.set(insight.submission_id, insight);
      continue;
    }

    const existingTime = new Date(`${existing.metric_date}T00:00:00Z`).getTime();
    const currentTime = new Date(`${insight.metric_date}T00:00:00Z`).getTime();

    if (currentTime >= existingTime) {
      latestInsightBySubmission.set(insight.submission_id, insight);
    }
  }

  const rankingMap = new Map<string, MissionRankingEntry[]>();

  for (const slug of missionSlugs) {
    const missionRows = submissions.filter((item) => item.mission_slug === slug);
    const ranked = missionRows
      .map((item) => {
        const latestInsight = latestInsightBySubmission.get(item.id);
        return {
          handle: item.creator_handle?.trim() || "@creator",
          reelUrl: item.reel_url,
          views: latestInsight?.plays ?? 0,
          submittedAt: item.submitted_at,
        };
      })
      .sort((a, b) => {
        if (b.views !== a.views) {
          return b.views - a.views;
        }

        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      })
      .slice(0, 3)
      .map((item, index) => ({
        rank: index + 1,
        handle: item.handle.startsWith("@") ? item.handle : `@${item.handle}`,
        reelUrl: item.reelUrl,
        views: item.views,
      }));

    rankingMap.set(slug, ranked);
  }

  return rankingMap;
}

function getMetaString(user: AuthUserLike | null, key: string): string | null {
  if (!user?.user_metadata || typeof user.user_metadata !== "object") {
    return null;
  }

  const value = user.user_metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toCreatorProfile(profile: ProfileRow | null, user: AuthUserLike | null = null): CreatorProfile {
  const fallbackNameFromEmail = user?.email?.split("@")[0] ?? fallbackCreatorProfile.name;
  const name = profile?.full_name ?? getMetaString(user, "full_name") ?? fallbackNameFromEmail;
  const handle = profile?.instagram_handle ?? getMetaString(user, "instagram_handle") ?? "@-";
  const niche = profile?.niche ?? getMetaString(user, "niche") ?? "-";
  const followers = profile?.followers_range ?? getMetaString(user, "followers_range") ?? "-";
  const joinedSource = profile?.created_at ?? user?.created_at;

  return {
    name,
    handle,
    platform: "Instagram",
    niche,
    followers,
    joinedAt: joinedSource
      ? new Date(joinedSource).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
      : fallbackCreatorProfile.joinedAt,
  };
}

export const getCurrentViewer = cache(async () => {
  if (!hasSupabaseConfig()) {
    return { configured: false as const, user: null };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { configured: false as const, user: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { configured: true as const, user };
});

export async function getMissionCatalog() {
  if (!hasSupabaseConfig()) {
    return { mode: "demo" as const, missions };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { mode: "demo" as const, missions };
  }

  const { data } = await supabase.from("missions").select("*").eq("is_active", true).order("display_order", { ascending: true });
  const missionRows = (data ?? []) as MissionRow[];
  const liveMissions = missionRows.map(toMission);

  // Keep live missions as source of truth, but include local fallback missions
  // that are not yet migrated into the database.
  const mergedMissionMap = new Map<string, Mission>();
  for (const item of missions) {
    mergedMissionMap.set(item.slug, item);
  }
  for (const item of liveMissions) {
    mergedMissionMap.set(item.slug, item);
  }

  const mergedMissions = Array.from(mergedMissionMap.values()).sort((a, b) => {
    const aOrder = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });

  return {
    mode: "live" as const,
    missions: mergedMissions,
  };
}

export async function getMissionCenterData() {
  const missionCatalog = await getMissionCatalog();
  const rankingMap = await getMissionRankingMap(missionCatalog.missions.map((mission) => mission.slug));
  const rankedMissions = withMissionRankings(missionCatalog.missions, rankingMap);

  if (!hasSupabaseConfig()) {
    return {
      ...missionCatalog,
      missions: rankedMissions,
      userLevel: 1,
      approvedMissionCount: 0,
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      ...missionCatalog,
      missions: rankedMissions,
      userLevel: 1,
      approvedMissionCount: 0,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ...missionCatalog,
      missions: rankedMissions,
      userLevel: 1,
      approvedMissionCount: 0,
    };
  }

  const { data: submissions } = await supabase
    .from("submissions")
    .select("mission_slug, status")
    .eq("user_id", user.id);

  const completedMissionSlugs = new Set(
    (submissions ?? [])
      .filter((item) => item.status === "Approved")
      .map((item) => item.mission_slug)
      .filter((slug): slug is string => typeof slug === "string" && slug.length > 0),
  );
  const approvedMissionCount = completedMissionSlugs.size;
  const userLevel = getCreatorLevelFromApprovedCount(approvedMissionCount);

  return {
    ...missionCatalog,
    userLevel,
    approvedMissionCount,
    missions: rankedMissions.filter((mission) => !completedMissionSlugs.has(mission.slug) && !hiddenMissionSlugs.has(mission.slug)),
  };
}

export async function getMissionBySlug(slug: string) {
  if (!hasSupabaseConfig()) {
    return missions.find((mission) => mission.slug === slug) ?? null;
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return missions.find((mission) => mission.slug === slug) ?? null;
  }

  const { data } = await supabase.from("missions").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  const missionRow = (data ?? null) as MissionRow | null;

  return missionRow ? toMission(missionRow) : missions.find((mission) => mission.slug === slug) ?? null;
}

export async function getRewardsCatalog() {
  if (!hasSupabaseConfig()) {
    return { mode: "demo" as const, rewards };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { mode: "demo" as const, rewards };
  }

  const { data } = await supabase.from("rewards_catalog").select("*").eq("is_active", true).order("display_order", { ascending: true });
  const rewardRows = (data ?? []) as RewardRow[];

  return {
    mode: "live" as const,
    rewards: rewardRows.length > 0 ? rewardRows.map(toReward) : rewards,
  };
}

export async function getRewardsPageData() {
  const rewardCatalog = await getRewardsCatalog();

  if (!hasSupabaseConfig()) {
    return {
      mode: "demo" as const,
      rewards: rewardCatalog.rewards,
      balance: 6840,
      redemptions: sampleRewardRedemptions,
      isAuthenticated: false,
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      mode: "demo" as const,
      rewards: rewardCatalog.rewards,
      balance: 6840,
      redemptions: sampleRewardRedemptions,
      isAuthenticated: false,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      mode: "live" as const,
      rewards: rewardCatalog.rewards,
      balance: 0,
      redemptions: [] as RewardRedemption[],
      isAuthenticated: false,
    };
  }

  const [{ data: transactions }, { data: redemptions }] = await Promise.all([
    supabase.from("coin_transactions").select("*").eq("user_id", user.id),
    supabase.from("reward_redemptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
  ]);

  const transactionRows = (transactions ?? []) as TransactionRow[];
  const redemptionRows = (redemptions ?? []) as RewardRedemptionRow[];

  return {
    mode: "live" as const,
    rewards: rewardCatalog.rewards,
    balance: transactionRows.reduce((sum, item) => sum + item.amount, 0),
    redemptions: redemptionRows.map(toRewardRedemption),
    isAuthenticated: true,
  };
}

export async function getDashboardData() {
  const missionCatalog = await getMissionCatalog();

  if (!hasSupabaseConfig()) {
    return {
      mode: "demo" as const,
      profile: fallbackCreatorProfile,
      submissions: [],
      balance: 6840,
      totalEarned: 6840,
      withdrawnSoFar: 0,
      availableToWithdraw: 6840,
      pendingCount: 0,
      activeMissions: [],
      missionStatusMap: new Map<string, SubmissionStatus>(),
      instagramConnection: null as InstagramConnectionRow | null,
      recentInsights: [] as ReelInsightRow[],
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      mode: "demo" as const,
      profile: fallbackCreatorProfile,
      submissions: [],
      balance: 6840,
      totalEarned: 6840,
      withdrawnSoFar: 0,
      availableToWithdraw: 6840,
      pendingCount: 0,
      activeMissions: [],
      missionStatusMap: new Map<string, SubmissionStatus>(),
      instagramConnection: null as InstagramConnectionRow | null,
      recentInsights: [] as ReelInsightRow[],
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      mode: "unauthenticated" as const,
      profile: null,
      submissions: [],
      balance: 0,
      totalEarned: 0,
      withdrawnSoFar: 0,
      availableToWithdraw: 0,
      pendingCount: 0,
      activeMissions: [],
      missionStatusMap: new Map<string, SubmissionStatus>(),
      instagramConnection: null as InstagramConnectionRow | null,
      recentInsights: [] as ReelInsightRow[],
    };
  }

  const [{ data: profile }, { data: submissions }, { data: transactions }, { data: instagramConnection }, { data: recentInsights }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("submissions").select("*").eq("user_id", user.id).order("submitted_at", { ascending: false }),
    supabase.from("coin_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("instagram_connections").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("reel_insights").select("*").eq("user_id", user.id).order("metric_date", { ascending: false }).limit(10),
  ]);

  const profileRow = (profile ?? null) as ProfileRow | null;
  const submissionRows = (submissions ?? []) as SubmissionRow[];
  const transactionRows = (transactions ?? []) as TransactionRow[];
  const instagramConnectionRow = (instagramConnection ?? null) as InstagramConnectionRow | null;
  const recentInsightRows = (recentInsights ?? []) as ReelInsightRow[];

  const typedSubmissions = submissionRows.map(toSubmission);
  const balance = transactionRows.reduce((sum: number, item) => sum + item.amount, 0);
  const totalEarned = transactionRows
    .filter((item) => item.amount > 0)
    .reduce((sum: number, item) => sum + item.amount, 0);
  const withdrawnSoFar = Math.abs(
    transactionRows
      .filter((item) => item.amount < 0)
      .reduce((sum: number, item) => sum + item.amount, 0),
  );
  
  // Build a map of mission slug to completion-aware status
  const missionStatusMap = new Map<string, SubmissionStatus>();
  submissionRows.forEach((row) => {
    const currentStatus = missionStatusMap.get(row.mission_slug);
    if (row.status === "Approved") {
      missionStatusMap.set(row.mission_slug, row.status as SubmissionStatus);
      return;
    }

    // Keep the most recent non-approved submission's status (submissions are sorted by submitted_at DESC)
    if (!currentStatus) {
      missionStatusMap.set(row.mission_slug, row.status as SubmissionStatus);
    }
  });

  const activeMissionSlugs = new Set(
    Array.from(missionStatusMap.entries())
      .filter(([, status]) => status !== "Approved")
      .map(([slug]) => slug),
  );
  const activeMissions = missionCatalog.missions.filter((mission) => activeMissionSlugs.has(mission.slug)).slice(0, 3);

  return {
    mode: "live" as const,
    profile: toCreatorProfile(profileRow, user),
    submissions: typedSubmissions,
    balance,
    totalEarned,
    withdrawnSoFar,
    availableToWithdraw: Math.max(balance, 0),
    pendingCount: typedSubmissions.filter((item) => item.status === "Pending").length,
    activeMissions,
    missionStatusMap,
    userEmail: user.email ?? null,
    instagramConnection: instagramConnectionRow,
    recentInsights: recentInsightRows,
  };
}

export async function getAdminReviewData() {
  if (!hasSupabaseConfig() || !hasSupabaseAdminConfig()) {
    return {
      mode: "demo" as const,
      submissions: [],
      authorized: false,
    };
  }

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  if (!supabase || !admin) {
    return {
      mode: "demo" as const,
      submissions: [],
      authorized: false,
    };
  }

  const [adminSession, {
    data: { user },
  }] = await Promise.all([hasAdminSession(), supabase.auth.getUser()]);

  if (!adminSession && (!user || !isAdminEmail(user.email))) {
    return {
      mode: "live" as const,
      submissions: [],
      authorized: false,
    };
  }

  const { data } = await admin.from("submissions").select("*").order("submitted_at", { ascending: false }).limit(20);
  const submissionRows = (data ?? []) as SubmissionRow[];

  const allScreenshotPaths = submissionRows.flatMap((row) =>
    Array.isArray(row.screenshot_paths)
      ? row.screenshot_paths.filter((item): item is string => typeof item === "string")
      : [],
  );

  const uniquePaths = Array.from(new Set(allScreenshotPaths));
  const signedUrlMap = new Map<string, string>();

  if (uniquePaths.length > 0) {
    const { data: signedUrls } = await admin.storage
      .from("mission screenshot")
      .createSignedUrls(uniquePaths, 60 * 60);

    (signedUrls ?? []).forEach((entry, index) => {
      if (entry?.signedUrl) {
        signedUrlMap.set(uniquePaths[index], entry.signedUrl);
      }
    });
  }

  return {
    mode: "live" as const,
    submissions: submissionRows.map((row) => {
      const parsedSubmission = toSubmission(row);
      return {
        ...parsedSubmission,
        screenshotSignedUrls: (parsedSubmission.screenshotPaths ?? [])
          .map((path) => signedUrlMap.get(path))
          .filter((url): url is string => Boolean(url)),
      };
    }),
    authorized: true,
  };
}

export async function getAdminRedemptionsData() {
  if (!hasSupabaseConfig() || !hasSupabaseAdminConfig()) {
    return {
      mode: "demo" as const,
      authorized: false,
      redemptions: sampleRewardRedemptions,
    };
  }

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  if (!supabase || !admin) {
    return {
      mode: "demo" as const,
      authorized: false,
      redemptions: sampleRewardRedemptions,
    };
  }

  const [adminSession, {
    data: { user },
  }] = await Promise.all([hasAdminSession(), supabase.auth.getUser()]);

  if (!adminSession && (!user || !isAdminEmail(user.email))) {
    return {
      mode: "live" as const,
      authorized: false,
      redemptions: [] as RewardRedemption[],
    };
  }

  const { data } = await admin.from("reward_redemptions").select("*").order("created_at", { ascending: false }).limit(30);
  const redemptionRows = (data ?? []) as RewardRedemptionRow[];

  return {
    mode: "live" as const,
    authorized: true,
    redemptions: redemptionRows.map(toRewardRedemption),
  };
}

export async function getBrandMissionManagerData() {
  const missionCatalog = await getMissionCatalog();

  if (!hasSupabaseConfig() || !hasSupabaseAdminConfig()) {
    return {
      mode: "demo" as const,
      authorized: false,
      missions: missionCatalog.missions,
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      mode: "demo" as const,
      authorized: false,
      missions: missionCatalog.missions,
    };
  }

  const [adminSession, {
    data: { user },
  }] = await Promise.all([hasAdminSession(), supabase.auth.getUser()]);

  if (!adminSession && (!user || !isBrandOrAdminEmail(user.email))) {
    return {
      mode: "live" as const,
      authorized: false,
      missions: [] as Mission[],
    };
  }

  return {
    mode: "live" as const,
    authorized: true,
    missions: missionCatalog.missions,
  };
}

export async function getAdminUsersData() {
  if (!hasSupabaseConfig() || !hasSupabaseAdminConfig()) {
    return {
      mode: "demo" as const,
      authorized: false,
      users: [] as AdminManagedUser[],
    };
  }

  const [supabase, admin] = await Promise.all([
    createSupabaseServerClient(),
    Promise.resolve(createSupabaseAdminClient()),
  ]);

  if (!supabase || !admin) {
    return {
      mode: "demo" as const,
      authorized: false,
      users: [] as AdminManagedUser[],
    };
  }

  const [adminSession, {
    data: { user },
  }] = await Promise.all([hasAdminSession(), supabase.auth.getUser()]);

  if (!adminSession && (!user || !isAdminEmail(user.email))) {
    return {
      mode: "live" as const,
      authorized: false,
      users: [] as AdminManagedUser[],
    };
  }

  const [{ data: authData, error: authError }, { data: profiles, error: profileError }] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 500 }),
    admin.from("profiles").select("*"),
  ]);

  if (authError || profileError) {
    return {
      mode: "live" as const,
      authorized: true,
      users: [] as AdminManagedUser[],
    };
  }

  const profileMap = new Map<string, ProfileRow>();
  (profiles ?? []).forEach((profile) => {
    profileMap.set(profile.id, profile as ProfileRow);
  });

  const adminEmails = new Set(getAdminEmails());
  const brandEmails = new Set(getBrandEmails());

  const users = (authData?.users ?? [])
    .map((authUser) => {
      const typedAuthUser = authUser as AuthUserLike;
      const profile = typedAuthUser.id ? profileMap.get(typedAuthUser.id) : null;
      const fallbackNameFromEmail = typedAuthUser.email?.split("@")[0] ?? "-";
      const email = typedAuthUser.email ?? "-";
      const normalizedEmail = email.toLowerCase();

      return {
        id: typedAuthUser.id ?? "",
        email,
        fullName: profile?.full_name ?? getMetaString(typedAuthUser, "full_name") ?? fallbackNameFromEmail,
        instagramHandle: profile?.instagram_handle ?? getMetaString(typedAuthUser, "instagram_handle") ?? "",
        niche: profile?.niche ?? getMetaString(typedAuthUser, "niche") ?? "",
        followersRange: profile?.followers_range ?? getMetaString(typedAuthUser, "followers_range") ?? "",
        portfolioUrl: profile?.portfolio_url ?? getMetaString(typedAuthUser, "portfolio_url") ?? "",
        createdAt: typedAuthUser.created_at ?? profile?.created_at ?? "",
        lastSignInAt: typedAuthUser.last_sign_in_at ?? "",
        isAdmin: adminEmails.has(normalizedEmail),
        isBrand: brandEmails.has(normalizedEmail),
      };
    })
    .filter((row) => Boolean(row.id))
    .sort((a, b) => {
      const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return right - left;
    });

  return {
    mode: "live" as const,
    authorized: true,
    users,
  };
}

export async function getLeaderboardData(): Promise<{ mode: "demo" | "live"; leaders: Leader[] }> {
  if (!hasSupabaseConfig() || !hasSupabaseAdminConfig()) {
    return { mode: "demo" as const, leaders };
  }

  const admin = createSupabaseAdminClient();

  if (!admin) {
    return { mode: "demo" as const, leaders };
  }

  // Aggregate coins per user from coin_transactions, join with profiles
  const { data: transactions } = await admin
    .from("coin_transactions")
    .select("user_id, amount");

  if (!transactions || transactions.length === 0) {
    return { mode: "live" as const, leaders: [] };
  }

  // Sum coins per user
  const coinMap = new Map<string, number>();
  for (const tx of transactions) {
    coinMap.set(tx.user_id, (coinMap.get(tx.user_id) ?? 0) + tx.amount);
  }

  // Count missions per user from submissions (approved)
  const { data: subs } = await admin
    .from("submissions")
    .select("user_id, status");

  const missionMap = new Map<string, number>();
  for (const sub of subs ?? []) {
    if (sub.status === "Approved") {
      missionMap.set(sub.user_id, (missionMap.get(sub.user_id) ?? 0) + 1);
    }
  }

  // Fetch profiles for names / handles
  const userIds = Array.from(coinMap.keys());
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, instagram_handle, followers_range")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const leaderRows: Leader[] = userIds
    .map((uid) => {
      const profile = profileMap.get(uid);
      return {
        name: profile?.instagram_handle ?? profile?.full_name ?? uid.slice(0, 8),
        platform: "Instagram",
        followers: profile?.followers_range ?? "-",
        coins: coinMap.get(uid) ?? 0,
        missionsCompleted: missionMap.get(uid) ?? 0,
      };
    })
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 20);

  return { mode: "live" as const, leaders: leaderRows };
}
