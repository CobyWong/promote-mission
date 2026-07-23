export type Mission = {
  slug: string;
  title: string;
  brand: string;
  product: string;
  imageUrl?: string;
  points: number;
  difficulty: "Easy" | "Medium" | "Hard";
  eta: string;
  category: string;
  description: string;
  hook: string;
  requirements: string[];
  deliverables: string[];
  tags: string[];
  displayOrder?: number;
  isActive?: boolean;
  status?: "draft" | "active" | "paused" | "full" | "ended" | "archived";
  startsAt?: string | null;
  endsAt?: string | null;
  archivedAt?: string | null;
  minParticipants?: number;
  currentParticipants?: number;
  lifecyclePhase?: "upcoming" | "live" | "ranking_confirmation" | "closed";
  rankingMetric?: "likes";
  rankingFinalizedAt?: string | null;
  rankingConfirmationEndsAt?: string | null;
  rankings?: MissionRankingEntry[];
};

export type MissionRankingEntry = {
  rank: number;
  handle: string;
  reelUrl: string;
  likes: number;
  prizeHkd?: number;
};

export type Reward = {
  slug: string;
  name: string;
  cost: number;
  minLevel?: number;
  badge?: string;
  description: string;
  eta?: string;
  stock?: number | null;
  displayOrder?: number;
  isActive?: boolean;
};

export type Leader = {
  name: string;
  platform: string;
  followers: string;
  coins: number;
  totalLikes: number;
  missionsCompleted?: number;
  reelUrl?: string;
};

export type ReelIdea = {
  title: string;
  description: string;
  angle: string;
};

export type SubmissionStatus = "Pending" | "Approved" | "Needs edits";

export type Submission = {
  id: string;
  creatorName: string;
  missionSlug: string;
  missionTitle: string;
  platform: string;
  submittedAt: string;
  submittedAtIso?: string;
  reelUrl: string;
  screenshotCount: number;
  status: SubmissionStatus;
  coins: number;
  notes: string;
  assignedReviewerId?: string | null;
  reviewedBy?: string | null;
  reviewDueAt?: string | null;
  slaBreachedAt?: string | null;
  screenshotPaths?: string[];
  screenshotSignedUrls?: string[];
  latestLikeCount?: number;
  latestPlayCount?: number;
  latestCommentCount?: number;
  latestInsightAt?: string | null;
};

export type AdminReviewer = {
  id: string;
  email: string;
};

export type RewardRedemptionStatus = "Pending" | "Fulfilled" | "Rejected";

export type RewardRedemption = {
  id: string;
  rewardSlug: string;
  rewardName: string;
  costCoins: number;
  status: RewardRedemptionStatus;
  createdAt: string;
  notes: string;
};

export type CreatorProfile = {
  userId: string;
  name: string;
  handle: string;
  platform: string;
  niche: string;
  followersRange: string;
  ageGroup: string;
  joinedAt: string;
};

export const reelIdeas: ReelIdea[] = [
  {
    title: "3 秒開場吸睛",
    description: "先用問題句或誇張對比留住觀眾，再展示產品解決方案。",
    angle: "痛點 → 產品解決方案"
  },
  {
    title: "日常生活代入",
    description: "喺返工、出街、gym 或 skincare routine 入面自然帶出產品。",
    angle: "日常生活融合"
  },
  {
    title: "前後對比畫面",
    description: "用 before/after 或使用前後場景切換，令成效更直觀。",
    angle: "轉變編輯"
  }
];

export const perks = [
  "支援 Instagram、TikTok、YouTube 任務",
  "完成後透明入帳 Coins",
  "上傳截圖審核，避免假單",
  "排行榜每月追加獎勵"
];

export const creatorOnboardingSteps = [
  "註冊帳號並驗證 email / 手機",
  "連接 Instagram 帳號及 creator 類型",
  "填寫受眾 niche、followers、過往作品",
  "開始接 mission，發佈 Reels 並完成 Instagram 同步"
];
