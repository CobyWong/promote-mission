export const DIFFICULTY_REQUIRED_LEVEL = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
} as const;

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

export function getCreatorLevelFromApprovedCount(approvedCount: number): number {
  if (approvedCount >= 8) {
    return 3;
  }

  if (approvedCount >= 3) {
    return 2;
  }

  return 1;
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
