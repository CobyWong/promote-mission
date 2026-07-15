export const DIFFICULTY_REQUIRED_LEVEL = {
  Easy: 1,
  Medium: 10,
  Hard: 20,
} as const;

export const MISSION_REWARD_COINS = {
  Easy: 100,
  Medium: 300,
  Hard: 500,
} as const;

export const MAX_CREATOR_LEVEL = 30;
export const CREATOR_EXP_PER_LEVEL = 1000;

const rewardRequiredLevelBySlug: Record<string, number> = {
  "parknshop-voucher-100": 1,
  "usdt-50": 10,
  "airpods-pro": 20,
  "sony-wh-1000xm5": 25,
};

export const MISSION_TOTAL_PRIZE_POOL_HKD = {
  Easy: 1000,
  Medium: 5000,
  Hard: 10000,
} as const;

export const MISSION_RANKING_REWARD_RATIOS = [0.6, 0.3, 0.1] as const;

export function getMissionRequiredLevel(difficulty: string): number {
  if (difficulty === "Hard") {
    return DIFFICULTY_REQUIRED_LEVEL.Hard;
  }

  if (difficulty === "Medium") {
    return DIFFICULTY_REQUIRED_LEVEL.Medium;
  }

  return DIFFICULTY_REQUIRED_LEVEL.Easy;
}

export function getMissionRewardCoins(difficulty: string): number {
  if (difficulty === "Hard") {
    return MISSION_REWARD_COINS.Hard;
  }

  if (difficulty === "Medium") {
    return MISSION_REWARD_COINS.Medium;
  }

  return MISSION_REWARD_COINS.Easy;
}

export function getCreatorLevelFromApprovedCount(approvedCount: number): number {
  const safeApprovedCount = Math.max(0, approvedCount);
  return getCreatorLevelFromTotalExp(safeApprovedCount * CREATOR_EXP_PER_LEVEL);
}

export function getCreatorLevelFromTotalExp(totalExp: number): number {
  const safeExp = Math.max(0, totalExp);
  return Math.min(MAX_CREATOR_LEVEL, Math.floor(safeExp / CREATOR_EXP_PER_LEVEL) + 1);
}

export function getLevelProgressFromTotalExp(totalExp: number) {
  const safeExp = Math.max(0, totalExp);
  const level = getCreatorLevelFromTotalExp(safeExp);
  const isMaxLevel = level >= MAX_CREATOR_LEVEL;
  const levelStartExp = (level - 1) * CREATOR_EXP_PER_LEVEL;
  const expIntoLevel = isMaxLevel ? CREATOR_EXP_PER_LEVEL : Math.max(0, safeExp - levelStartExp);
  const expToNextLevel = isMaxLevel ? 0 : Math.max(CREATOR_EXP_PER_LEVEL - expIntoLevel, 0);
  const progressPercent = isMaxLevel ? 100 : Math.min(100, Math.max(0, (expIntoLevel / CREATOR_EXP_PER_LEVEL) * 100));

  return {
    level,
    totalExp: safeExp,
    expIntoLevel,
    expToNextLevel,
    expForNextLevel: CREATOR_EXP_PER_LEVEL,
    progressPercent,
    isMaxLevel,
  };
}

export function getRewardRequiredLevel(rewardSlug: string): number {
  return rewardRequiredLevelBySlug[rewardSlug] ?? 1;
}

export function getLevelAccessSummary(level: number, locale: "en" | "zh-HK" = "en"): string {
  if (level >= DIFFICULTY_REQUIRED_LEVEL.Hard) {
    return locale === "en" ? "All mission difficulties unlocked" : "已解鎖所有任務難度";
  }

  if (level >= DIFFICULTY_REQUIRED_LEVEL.Medium) {
    return locale === "en" ? "Easy + Medium missions unlocked" : "已解鎖 Easy + Medium 任務";
  }

  return locale === "en" ? "Easy missions only" : "只可接 Easy 任務";
}

export function getMissionTotalPrizeByDifficulty(difficulty: string): number {
  if (difficulty === "Hard") {
    return MISSION_TOTAL_PRIZE_POOL_HKD.Hard;
  }

  if (difficulty === "Medium") {
    return MISSION_TOTAL_PRIZE_POOL_HKD.Medium;
  }

  return MISSION_TOTAL_PRIZE_POOL_HKD.Easy;
}

export function getRankingRewardByPosition(position: number, totalPrizeHkd: number): number {
  if (position <= 0 || position > MISSION_RANKING_REWARD_RATIOS.length) {
    return 0;
  }

  const ratio = MISSION_RANKING_REWARD_RATIOS[position - 1];
  return Math.round(totalPrizeHkd * ratio);
}

export function getRankingRewardsByDifficulty(difficulty: string) {
  const totalPrize = getMissionTotalPrizeByDifficulty(difficulty);
  return {
    first: getRankingRewardByPosition(1, totalPrize),
    second: getRankingRewardByPosition(2, totalPrize),
    third: getRankingRewardByPosition(3, totalPrize),
    totalPrize,
  };
}
