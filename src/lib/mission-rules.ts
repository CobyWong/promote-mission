export const DIFFICULTY_REQUIRED_LEVEL = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
} as const;

export const MISSION_LIKE_REWARD_TIERS_HKD = [600, 300, 100] as const;

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

export function getRankingRewardByPosition(position: number): number {
  if (position <= 0 || position > MISSION_LIKE_REWARD_TIERS_HKD.length) {
    return 0;
  }

  return MISSION_LIKE_REWARD_TIERS_HKD[position - 1];
}
