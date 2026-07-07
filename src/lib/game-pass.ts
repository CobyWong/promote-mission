import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { getCreatorLevelFromTotalExp, MAX_CREATOR_LEVEL } from "@/lib/mission-rules";

type LevelReward = {
  level: number;
  coins: number;
};

export function getGamePassLevelRewardCoins(level: number) {
  const safeLevel = Math.max(1, Math.min(level, MAX_CREATOR_LEVEL));
  const baseReward = 120 + (safeLevel - 1) * 20;
  const milestoneBonus = safeLevel % 5 === 0 ? 250 : 0;
  return baseReward + milestoneBonus;
}

export function getLevelUpRewardsBetweenExp(previousExp: number, nextExp: number): LevelReward[] {
  const previousLevel = getCreatorLevelFromTotalExp(previousExp);
  const nextLevel = getCreatorLevelFromTotalExp(nextExp);

  if (nextLevel <= previousLevel) {
    return [];
  }

  const rewards: LevelReward[] = [];
  for (let level = previousLevel + 1; level <= nextLevel; level += 1) {
    rewards.push({
      level,
      coins: getGamePassLevelRewardCoins(level),
    });
  }

  return rewards;
}

export async function awardGamePassLevelUpRewards(params: {
  admin: SupabaseClient<Database>;
  userId: string;
  submissionId: string;
  previousExp: number;
  nextExp: number;
}) {
  const rewards = getLevelUpRewardsBetweenExp(params.previousExp, params.nextExp);

  if (rewards.length === 0) {
    return [] as LevelReward[];
  }

  const awarded: LevelReward[] = [];

  for (const reward of rewards) {
    const description = `Game Pass level reward Lv.${reward.level}`;

    const { data: existing } = await params.admin
      .from("coin_transactions")
      .select("id")
      .eq("user_id", params.userId)
      .eq("transaction_type", "level_up_reward")
      .eq("description", description)
      .maybeSingle();

    if (existing?.id) {
      continue;
    }

    const { error } = await params.admin.from("coin_transactions").insert({
      user_id: params.userId,
      submission_id: params.submissionId,
      amount: reward.coins,
      transaction_type: "level_up_reward",
      description,
    });

    if (error) {
      continue;
    }

    awarded.push(reward);
  }

  return awarded;
}