export type Mission = {
  slug: string;
  title: string;
  brand: string;
  product: string;
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
};

export type Reward = {
  slug: string;
  name: string;
  cost: number;
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
  missionsCompleted?: number;
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
  reelUrl: string;
  screenshotCount: number;
  status: SubmissionStatus;
  coins: number;
  notes: string;
  screenshotPaths?: string[];
  screenshotSignedUrls?: string[];
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
  name: string;
  handle: string;
  platform: string;
  niche: string;
  followers: string;
  joinedAt: string;
};

export const stats = [
  { label: "活躍創作者", value: "2,400+" },
  { label: "已派發獎賞", value: "HK$580K+" },
  { label: "任務完成率", value: "98%" },
  { label: "平均審核時間", value: "24hr" },
];

export const missions: Mission[] = [
  {
    slug: "spark-hydration-bottle",
    title: "30 秒 Reels 介紹智能保溫水樽",
    brand: "Spark Living",
    product: "Hydration Bottle Pro",
    points: 1200,
    difficulty: "Easy",
    eta: "1 day",
    category: "Lifestyle",
    description: "用日常生活情境拍一條 IG Reels，展示產品外觀、保溫效果同實際使用場景。",
    hook: "朝早返工前 3 秒內展示『咖啡仲熱辣辣』效果。",
    requirements: [
      "影片長度 20-35 秒",
      "必須 tag 品牌帳號同指定 hashtag",
      "Caption 需要提及 24 小時保溫賣點",
      "影片公開至少保留 7 日"
    ],
    deliverables: [
      "IG Reels 連結",
      "發佈成功截圖",
      "Insights 截圖（48 小時後補交）"
    ],
    tags: ["IG Reels", "Product Demo", "UGC"]
  },
  {
    slug: "nova-beauty-serum",
    title: "開箱美白精華前後對比 Reels",
    brand: "Nova Beauty",
    product: "Glow Reset Serum",
    points: 1800,
    difficulty: "Medium",
    eta: "2 days",
    category: "Beauty",
    description: "以開箱 + 使用感受形式拍攝，突出質地、香味及皮膚光澤感提升。",
    hook: "用『我最近最常被問皮膚做咩事』做開場。",
    requirements: [
      "影片長度 25-45 秒",
      "首 5 秒需要有產品近鏡",
      "不能作醫療或誇張功效聲稱",
      "至少 1 個 before/after 畫面"
    ],
    deliverables: [
      "IG Reels 連結",
      "Story 分享截圖",
      "Hashtag 清單核對"
    ],
    tags: ["Beauty", "Before After", "Organic Style"]
  },
  {
    slug: "fitbyte-protein-chips",
    title: "健身零食試食挑戰短片",
    brand: "FitByte",
    product: "Protein Chips Combo",
    points: 950,
    difficulty: "Easy",
    eta: "1 day",
    category: "Fitness",
    description: "拍攝 gym 前後或辦公室 snack break 場景，強調高蛋白、低罪惡感。",
    hook: "『當你想食薯片但又唔想爆卡路里』。",
    requirements: [
      "影片長度 15-30 秒",
      "最少展示 2 款口味",
      "畫面要清楚看到包裝",
      "Caption 加入優惠碼"
    ],
    deliverables: [
      "IG Reels 連結",
      "封面截圖"
    ],
    tags: ["Food", "Fitness", "Promo Code"]
  },
  {
    slug: "roam-mini-projector",
    title: "居家小影院體驗 Reels",
    brand: "Roam Tech",
    product: "MiniBeam Projector",
    points: 2400,
    difficulty: "Hard",
    eta: "3 days",
    category: "Tech",
    description: "拍攝房間佈置、投影畫質同朋友聚會氛圍，營造『即刻想買』感覺。",
    hook: "一面白牆就變身私人影院。",
    requirements: [
      "影片長度 30-45 秒",
      "需要日間及夜間畫面對比",
      "至少 1 個 lifestyle 鏡頭",
      "標註品牌官網 CTA"
    ],
    deliverables: [
      "IG Reels 連結",
      "拍攝素材縮圖 3 張",
      "成效數據截圖"
    ],
    tags: ["Tech", "Home Setup", "Cinematic"]
  }
];

export const rewards: Reward[] = [
  {
    slug: "parknshop-voucher-100",
    name: "百佳禮券 HK$100",
    cost: 2000,
    badge: "熱門",
    description: "最受歡迎日常獎賞，適合新手創作者快速兌換。",
    eta: "1-3 個工作天",
    stock: 120
  },
  {
    slug: "usdt-50",
    name: "USDT 50 等值",
    cost: 5000,
    badge: "現金級",
    description: "完成幾個中型任務就可以直接兌換。",
    eta: "1-2 個工作天",
    stock: 80
  },
  {
    slug: "airpods-pro",
    name: "AirPods Pro",
    cost: 28000,
    badge: "人氣",
    description: "給長期穩定交稿嘅創作者升級日常裝備。",
    eta: "5-7 個工作天",
    stock: 12
  },
  {
    slug: "sony-wh-1000xm5",
    name: "Sony WH-1000XM5",
    cost: 45000,
    description: "高價值兌換選項，適合排行榜前列玩家。",
    eta: "5-7 個工作天",
    stock: 8
  }
];

export const leaders: Leader[] = [
  { name: "Alex_HK", platform: "Instagram", followers: "48.5K", coins: 16800, missionsCompleted: 14 },
  { name: "Sarah創作", platform: "TikTok", followers: "36.2K", coins: 15200, missionsCompleted: 12 },
  { name: "Kevin_323", platform: "YouTube", followers: "29.8K", coins: 14150, missionsCompleted: 11 },
  { name: "Mandy_Vlog", platform: "Instagram", followers: "21.4K", coins: 12380, missionsCompleted: 9 },
  { name: "Chloe_Creates", platform: "Instagram", followers: "18.9K", coins: 10940, missionsCompleted: 8 },
  { name: "JayReels", platform: "TikTok", followers: "15.3K", coins: 9200, missionsCompleted: 7 },
  { name: "BeautyByMei", platform: "Instagram", followers: "13.1K", coins: 7850, missionsCompleted: 6 },
  { name: "FitnessBro88", platform: "YouTube", followers: "11.6K", coins: 6400, missionsCompleted: 5 },
  { name: "LifestyleLora", platform: "TikTok", followers: "9.4K", coins: 4900, missionsCompleted: 4 },
  { name: "TasteHKDiner", platform: "Instagram", followers: "7.2K", coins: 3200, missionsCompleted: 3 },
];

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

export const creatorProfile: CreatorProfile = {
  name: "Chloe Wong",
  handle: "@chloe.creates",
  platform: "Instagram",
  niche: "Lifestyle / Beauty",
  followers: "12.8K",
  joinedAt: "May 2026"
};

export const creatorOnboardingSteps = [
  "註冊帳號並驗證 email / 手機",
  "連接 Instagram 帳號及 creator 類型",
  "填寫受眾 niche、followers、過往作品",
  "開始接 mission 並提交 proof"
];

export const sampleSubmissions: Submission[] = [
  {
    id: "SUB-2048",
    creatorName: "Chloe Wong",
    missionSlug: "spark-hydration-bottle",
    missionTitle: "30 秒 Reels 介紹智能保溫水樽",
    platform: "Instagram Reels",
    submittedAt: "2026-05-21 14:20",
    reelUrl: "https://instagram.com/reel/demo-hydration",
    screenshotCount: 3,
    status: "Pending",
    coins: 1200,
    notes: "Caption 已加 hashtag，48 小時後會補 insights。",
    screenshotPaths: ["screenshots/demo-1.jpg", "screenshots/demo-2.jpg", "screenshots/demo-3.jpg"]
  },
  {
    id: "SUB-2041",
    creatorName: "Mandy Lau",
    missionSlug: "nova-beauty-serum",
    missionTitle: "開箱美白精華前後對比 Reels",
    platform: "Instagram Reels",
    submittedAt: "2026-05-21 10:05",
    reelUrl: "https://instagram.com/reel/demo-serum",
    screenshotCount: 4,
    status: "Needs edits",
    coins: 1800,
    notes: "畫面清晰，但首 5 秒產品 close-up 不夠明顯。",
    screenshotPaths: ["screenshots/demo-4.jpg", "screenshots/demo-5.jpg", "screenshots/demo-6.jpg", "screenshots/demo-7.jpg"]
  },
  {
    id: "SUB-2037",
    creatorName: "Alex Ho",
    missionSlug: "fitbyte-protein-chips",
    missionTitle: "健身零食試食挑戰短片",
    platform: "Instagram Reels",
    submittedAt: "2026-05-20 21:10",
    reelUrl: "https://instagram.com/reel/demo-fitbyte",
    screenshotCount: 2,
    status: "Approved",
    coins: 950,
    notes: "內容自然，優惠碼展示清晰，已入帳。",
    screenshotPaths: ["screenshots/demo-8.jpg", "screenshots/demo-9.jpg"]
  }
];

export const sampleRewardRedemptions: RewardRedemption[] = [
  {
    id: "RED-9001",
    rewardSlug: "parknshop-voucher-100",
    rewardName: "百佳禮券 HK$100",
    costCoins: 2000,
    status: "Pending",
    createdAt: "2026-05-21 15:40",
    notes: "等待 operations team 發出 voucher code"
  },
  {
    id: "RED-8998",
    rewardSlug: "usdt-50",
    rewardName: "USDT 50 等值",
    costCoins: 5000,
    status: "Fulfilled",
    createdAt: "2026-05-19 10:20",
    notes: "已完成 wallet transfer"
  }
];
