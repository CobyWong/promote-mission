import type { SupabaseClient } from "@supabase/supabase-js";

import { createUserNotification } from "@/lib/notifications";
import type { Database } from "@/lib/supabase/database.types";

type SettlePayload = {
  settled?: boolean;
  rewardCoins?: number;
  inviterUserId?: string;
  invitedUserId?: string;
  submissionId?: string;
};

const referralMilestoneThresholds = [3, 5, 10, 20, 30];

function getSeasonKey(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}${month}`;
}

function getIsoWeekKey(date = new Date()) {
  const temp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((temp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${temp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

async function insertCoinIfMissing(params: {
  admin: SupabaseClient<Database>;
  userId: string;
  submissionId?: string | null;
  amount: number;
  transactionType: string;
  description: string;
}) {
  const { data: existing } = await params.admin
    .from("coin_transactions")
    .select("id")
    .eq("user_id", params.userId)
    .eq("transaction_type", params.transactionType)
    .eq("description", params.description)
    .maybeSingle();

  if (existing?.id) {
    return false;
  }

  const { error } = await params.admin.from("coin_transactions").insert({
    user_id: params.userId,
    submission_id: params.submissionId ?? null,
    amount: params.amount,
    transaction_type: params.transactionType,
    description: params.description,
  });

  return !error;
}

export async function handleReferralPostSettlement(params: {
  admin: SupabaseClient<Database>;
  settlePayload: SettlePayload | null;
}) {
  const payload = params.settlePayload;
  if (!payload?.settled || !payload.inviterUserId || !payload.invitedUserId || !payload.submissionId) {
    return { held: false, holdAmount: 0, milestoneBonus: 0, streakBonus: 0 };
  }

  const admin = params.admin;

  const { data: referral } = await admin
    .from("referrals")
    .select("id, inviter_user_id, invited_user_id, rewarded_at")
    .eq("inviter_user_id", payload.inviterUserId)
    .eq("invited_user_id", payload.invitedUserId)
    .maybeSingle();

  if (!referral?.id) {
    return { held: false, holdAmount: 0, milestoneBonus: 0, streakBonus: 0 };
  }

  const [submissionRow, burstRows] = await Promise.all([
    admin
      .from("submissions")
      .select("submitted_at")
      .eq("id", payload.submissionId)
      .maybeSingle(),
    admin
      .from("referrals")
      .select("id")
      .eq("inviter_user_id", payload.inviterUserId)
      .eq("status", "Rewarded")
      .gte("rewarded_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const riskFlags: string[] = [];

  if ((burstRows.data ?? []).length >= 3) {
    riskFlags.push("inviter_burst_24h");
  }

  if (submissionRow.data?.submitted_at && referral.rewarded_at) {
    const submitTs = new Date(submissionRow.data.submitted_at).getTime();
    const rewardTs = new Date(referral.rewarded_at).getTime();
    if (!Number.isNaN(submitTs) && !Number.isNaN(rewardTs) && rewardTs - submitTs < 10 * 60 * 1000) {
      riskFlags.push("fast_reward_turnaround");
    }
  }

  const riskScore = riskFlags.length * 40;
  const shouldHold = riskScore >= 40;
  let holdAmount = 0;

  if (shouldHold && (payload.rewardCoins ?? 0) > 0) {
    holdAmount = Math.max(payload.rewardCoins ?? 0, 0);
    const holdDescription = `Referral hold for ${payload.submissionId}`;
    const holdInserted = await insertCoinIfMissing({
      admin,
      userId: payload.inviterUserId,
      submissionId: payload.submissionId,
      amount: -holdAmount,
      transactionType: "referral_reward_hold",
      description: holdDescription,
    });

    if (holdInserted) {
      await admin.from("referral_reward_holds").insert({
        referral_id: referral.id,
        inviter_user_id: payload.inviterUserId,
        invited_user_id: payload.invitedUserId,
        submission_id: payload.submissionId,
        amount: holdAmount,
        risk_score: riskScore,
        risk_flags: riskFlags,
        status: "pending",
        hold_until: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      });

      await createUserNotification({
        userId: payload.inviterUserId,
        type: "system",
        title: "Referral reward under review",
        message: `Your referral reward (+${holdAmount} Coins) is temporarily on hold for risk review.`,
        link: "/dashboard",
        metadata: {
          submissionId: payload.submissionId,
          riskFlags,
        },
      });
    }
  }

  const seasonKey = getSeasonKey();
  await admin.from("referrals").update({
    reward_status: shouldHold ? "hold" : "released",
    review_status: shouldHold ? "pending" : "auto",
    reward_hold_until: shouldHold ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() : null,
    risk_score: riskScore,
    risk_flags: riskFlags,
    season_key: seasonKey,
    referral_stage: shouldHold ? "reward_pending" : "reward_released",
  }).eq("id", referral.id);

  if (shouldHold) {
    return { held: true, holdAmount, milestoneBonus: 0, streakBonus: 0 };
  }

  const { data: rewardedReferrals } = await admin
    .from("referrals")
    .select("id, rewarded_at")
    .eq("inviter_user_id", payload.inviterUserId)
    .eq("status", "Rewarded")
    .eq("reward_status", "released");

  const rewardedCount = (rewardedReferrals ?? []).length;

  let milestoneBonus = 0;
  if (referralMilestoneThresholds.includes(rewardedCount)) {
    milestoneBonus = rewardedCount * 50;
    const inserted = await insertCoinIfMissing({
      admin,
      userId: payload.inviterUserId,
      submissionId: payload.submissionId,
      amount: milestoneBonus,
      transactionType: "referral_milestone_bonus",
      description: `Referral milestone bonus at ${rewardedCount} rewarded invites`,
    });

    if (inserted) {
      await createUserNotification({
        userId: payload.inviterUserId,
        type: "system",
        title: "Referral milestone unlocked",
        message: `You reached ${rewardedCount} rewarded invites. +${milestoneBonus} Coins awarded.`,
        link: "/dashboard",
      });
    } else {
      milestoneBonus = 0;
    }
  }

  const weekKey = getIsoWeekKey();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentRewardedCount = (rewardedReferrals ?? []).filter((item) => item.rewarded_at && item.rewarded_at >= weekAgo).length;

  let streakBonus = 0;
  if (recentRewardedCount >= 3) {
    streakBonus = 300;
    const inserted = await insertCoinIfMissing({
      admin,
      userId: payload.inviterUserId,
      submissionId: payload.submissionId,
      amount: streakBonus,
      transactionType: "referral_streak_bonus",
      description: `Referral streak bonus ${weekKey}`,
    });

    if (inserted) {
      await createUserNotification({
        userId: payload.inviterUserId,
        type: "system",
        title: "Referral streak bonus",
        message: `Great momentum this week. +${streakBonus} Coins streak bonus awarded.`,
        link: "/dashboard",
      });
    } else {
      streakBonus = 0;
    }
  }

  return {
    held: false,
    holdAmount,
    milestoneBonus,
    streakBonus,
  };
}
