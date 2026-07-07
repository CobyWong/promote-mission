import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSeasonRange(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0));
  const seasonKey = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  return { start: start.toISOString(), end: end.toISOString(), seasonKey };
}

export async function GET() {
  const [supabase, admin] = await Promise.all([
    createSupabaseServerClient(),
    Promise.resolve(createSupabaseAdminClient()),
  ]);

  if (!supabase || !admin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { start, end, seasonKey } = getSeasonRange();

  const [{ data: referralProfile }, { data: referrals }, { data: holds }] = await Promise.all([
    admin.from("referral_profiles").select("referral_code").eq("user_id", user.id).maybeSingle(),
    admin.from("referrals").select("id, invited_user_id, status, created_at, rewarded_at, reward_status, review_status, reminder_count").eq("inviter_user_id", user.id),
    admin.from("referral_reward_holds").select("id, status").eq("inviter_user_id", user.id).eq("status", "pending"),
  ]);

  const referralRows = referrals ?? [];
  const invitedUserIds = referralRows.map((item) => item.invited_user_id);

  const submissionsByInvited = invitedUserIds.length > 0
    ? await admin.from("submissions").select("user_id, status").in("user_id", invitedUserIds)
    : { data: [] as Array<{ user_id: string; status: string }> };

  const submissions = submissionsByInvited.data ?? [];
  const firstSubmissionUsers = new Set(submissions.map((item) => item.user_id));
  const firstApprovedUsers = new Set(submissions.filter((item) => item.status === "Approved").map((item) => item.user_id));

  const invitedCount = referralRows.length;
  const registeredCount = invitedCount;
  const firstSubmissionCount = firstSubmissionUsers.size;
  const firstApprovedCount = firstApprovedUsers.size;
  const rewardedCount = referralRows.filter((item) => item.status === "Rewarded" && item.reward_status !== "hold").length;
  const pendingReviewCount = referralRows.filter((item) => item.review_status === "pending").length + (holds ?? []).length;

  const reminderCandidates = referralRows.filter((item) => {
    const createdTs = new Date(item.created_at).getTime();
    const now = Date.now();
    const hasApproved = firstApprovedUsers.has(item.invited_user_id);
    return !hasApproved && now - createdTs > 24 * 60 * 60 * 1000;
  });

  const rewardedThisSeason = referralRows.filter((item) => item.rewarded_at && item.rewarded_at >= start && item.rewarded_at < end).length;
  const streak7d = referralRows.filter((item) => item.rewarded_at && item.rewarded_at >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).length;

  const thresholds = [3, 5, 10, 20, 30];
  const nextMilestone = thresholds.find((value) => value > rewardedCount) ?? null;

  const seasonReferralsResult = await admin
    .from("referrals")
    .select("inviter_user_id, rewarded_at, status")
    .eq("status", "Rewarded")
    .gte("rewarded_at", start)
    .lt("rewarded_at", end);

  const seasonReferrals = seasonReferralsResult.data ?? [];
  const countMap = new Map<string, number>();

  for (const row of seasonReferrals) {
    countMap.set(row.inviter_user_id, (countMap.get(row.inviter_user_id) ?? 0) + 1);
  }

  const ranked = Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([userId, rewardedInvites], index) => ({
      rank: index + 1,
      userId,
      rewardedInvites,
    }));

  const leaderboardUserIds = ranked.map((item) => item.userId);
  const profileRows = leaderboardUserIds.length > 0
    ? await admin.from("profiles").select("id, full_name, instagram_handle, public_user_id").in("id", leaderboardUserIds)
    : { data: [] as Array<{ id: string; full_name: string | null; instagram_handle: string | null; public_user_id: string }> };

  const profileMap = new Map((profileRows.data ?? []).map((item) => [item.id, item]));

  const leaderboard = ranked.map((item) => {
    const profile = profileMap.get(item.userId);
    return {
      rank: item.rank,
      name: profile?.full_name || profile?.instagram_handle || profile?.public_user_id || `USR-${item.userId.slice(0, 8).toUpperCase()}`,
      rewardedInvites: item.rewardedInvites,
    };
  });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const referralCode = referralProfile?.referral_code ?? "MISSIONON";
  const inviteUrl = `${appUrl}/register?ref=${encodeURIComponent(referralCode)}`;

  return NextResponse.json({
    referralCode,
    seasonKey,
    funnel: {
      invited: invitedCount,
      registered: registeredCount,
      firstSubmission: firstSubmissionCount,
      firstApproved: firstApprovedCount,
      rewarded: rewardedCount,
      pendingReview: pendingReviewCount,
    },
    growth: {
      streak7d,
      rewardedThisSeason,
      nextMilestone,
      nextMilestoneRemaining: nextMilestone ? Math.max(nextMilestone - rewardedCount, 0) : 0,
    },
    reminders: {
      candidateCount: reminderCandidates.length,
    },
    shareKit: {
      inviteUrl,
      whatsappText: `Join Mission One with my referral code ${referralCode}: ${inviteUrl}`,
      telegramText: `Join Mission One with my referral code ${referralCode}: ${inviteUrl}`,
      instagramCaption: `Use my referral code ${referralCode} and start your first mission today. ${inviteUrl}`,
    },
    leaderboard,
  });
}
