"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import type { Locale } from "@/lib/i18n";

type OnboardingStep = {
  path: string;
  zhTitle: string;
  enTitle: string;
  zhDesc: string;
  enDesc: string;
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    path: "/dashboard",
    zhTitle: "控制台 Dashboard",
    enTitle: "Dashboard",
    zhDesc: "睇你嘅 Coins、提交狀態同進度，呢度係你每日最常用頁面。",
    enDesc: "Check your Coins, submission status, and progress. This is your daily command center.",
  },
  {
    path: "/missions",
    zhTitle: "任務中心 Missions",
    enTitle: "Missions",
    zhDesc: "揀任務前先睇清楚 requirements 同 deliverables，避免交稿被退回。",
    enDesc: "Review requirements and deliverables before accepting to avoid rework.",
  },
  {
    path: "/rewards",
    zhTitle: "獎賞商城 Rewards",
    enTitle: "Rewards",
    zhDesc: "用 Coins 換獎賞，記得留意庫存同兌換所需 Coins。",
    enDesc: "Redeem your Coins for rewards. Watch stock and required Coins.",
  },
  {
    path: "/leaderboard",
    zhTitle: "排行榜 Leaderboard",
    enTitle: "Leaderboard",
    zhDesc: "跟住本月排名衝榜，第一名有每月大獎。",
    enDesc: "Track monthly rankings and climb to #1 for the monthly grand prize.",
  },
];

function getOnboardingStorageKey(userId: string) {
  return `promote-mission:onboarding:v1:${userId}`;
}

function findOnboardingStepIndex(pathname: string) {
  const exactIndex = ONBOARDING_STEPS.findIndex((step) => step.path === pathname);
  if (exactIndex >= 0) {
    return exactIndex;
  }

  const prefixIndex = ONBOARDING_STEPS.findIndex((step) => pathname.startsWith(step.path));
  return prefixIndex >= 0 ? prefixIndex : 0;
}

const TIPS: Record<string, { zh: string; en: string }[]> = {
  "/": [
    { zh: "嘿！我係小P，你嘅任務嚮導～ 完成任務就可以賺金幣換獎賞！", en: "Hey! I'm P-Bot, your mission guide! Complete missions to earn Coins and redeem rewards!" },
    { zh: "想開始？去「任務中心」揀一個你鍾意嘅品牌任務！", en: "Ready to start? Head to Missions and pick a brand task you like!" },
  ],
  "/missions": [
    { zh: "呢度有晒可以接嘅任務！點擊任務睇清楚要求先好接！", en: "All available missions are here! Click one to read the brief before accepting." },
    { zh: "任務難度越高，金幣獎勵越多！量力而為喎～", en: "Higher difficulty = more Coins! Choose wisely." },
  ],
  "/rewards": [
    { zh: "呢度可以用金幣換心水獎賞！記得注意庫存，先到先得！", en: "Spend your Coins here on rewards! Watch the stock — first come, first served!" },
    { zh: "金幣唔夠？去接多幾個任務先！", en: "Not enough Coins? Go complete more missions first!" },
  ],
  "/leaderboard": [
    { zh: "本月金幣收益排第一，可以攞名錶獎勵！衝啊！", en: "The #1 creator this month wins a luxury watch! Go for it!" },
    { zh: "完成任務數量同追蹤數都有排名，唔止金幣先算！", en: "Rankings also track missions done and followers — not just Coins!" },
  ],
  "/dashboard": [
    { zh: "呢度係你嘅個人控制台，追蹤任務進度同提交記錄！", en: "This is your personal dashboard — track your missions and submission history!" },
    { zh: "有待審核嘅提交？耐心等等，審核通過就即刻入帳！", en: "Submissions pending? Sit tight — Coins land as soon as you're approved!" },
  ],
  "/login": [
    { zh: "登入就可以接任務、賺金幣、換獎賞！", en: "Log in to start accepting missions, earning Coins, and redeeming rewards!" },
  ],
  "/register": [
    { zh: "加入我哋！建立帳號就可以立即開始接任務！", en: "Join us! Create an account and start accepting missions right away!" },
  ],
};

function getTips(pathname: string, locale: Locale) {
  // Exact match first
  const exact = TIPS[pathname];
  if (exact) return locale === "en" ? exact.map((t) => t.en) : exact.map((t) => t.zh);

  // Prefix match (e.g. /missions/some-slug)
  const prefix = Object.keys(TIPS).find((key) => key !== "/" && pathname.startsWith(key));
  if (prefix) {
    const tips = TIPS[prefix];
    if (prefix === "/missions") {
      const missionTips = [
        { zh: "睇清楚任務要求，特別係 Deliverables，確保你嘅內容符合要求先好接！", en: "Read the deliverables carefully before accepting — make sure your content fits!" },
        { zh: "接受任務後倒數就開始，記得準時提交！", en: "The countdown starts the moment you accept — don't miss the deadline!" },
      ];
      return locale === "en" ? missionTips.map((t) => t.en) : missionTips.map((t) => t.zh);
    }
    if (prefix === "/submit") {
      const submitTips = [
        { zh: "提交時要填 Reel 連結同截圖，缺一不可！", en: "You need both the Reel URL and a screenshot — both are required!" },
        { zh: "截圖要包含觀看次數同發佈日期，方便審核！", en: "Screenshot should show view count and publish date to speed up review!" },
      ];
      return locale === "en" ? submitTips.map((t) => t.en) : submitTips.map((t) => t.zh);
    }
    return locale === "en" ? tips.map((t) => t.en) : tips.map((t) => t.zh);
  }

  // Default
  const defaultTips = [
    { zh: "有問題？我係小P，隨時喺度幫你！", en: "Need help? I'm P-Bot, always here for you!" },
  ];
  return locale === "en" ? defaultTips.map((t) => t.en) : defaultTips.map((t) => t.zh);
}

export function Mascot({ locale, userId }: { locale: Locale; userId?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [onboardingActive, setOnboardingActive] = useState(false);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);

  const tips = getTips(pathname, locale);
  const onboardingStep = ONBOARDING_STEPS[onboardingStepIndex];

  function completeOnboarding() {
    if (userId) {
      try {
        localStorage.setItem(getOnboardingStorageKey(userId), "done");
      } catch {
        // no-op in blocked storage mode
      }
    }

    setOnboardingActive(false);
  }

  // Reset tip index when page changes, auto-open on first visit
  useEffect(() => {
    setTipIndex(0);
    setOpen(true);
    setVisible(true);
  }, [pathname]);

  // One-time onboarding tour for first login
  useEffect(() => {
    if (!userId) {
      setOnboardingActive(false);
      return;
    }

    try {
      const done = localStorage.getItem(getOnboardingStorageKey(userId)) === "done";
      if (!done) {
        setOnboardingActive(true);
        setOpen(true);
        setOnboardingStepIndex(findOnboardingStepIndex(pathname));
      }
    } catch {
      // no-op
    }
  }, [pathname, userId]);

  if (!visible) {
    return (
      <button
        type="button"
        aria-label="Open guide"
        onClick={() => { setVisible(true); setOpen(true); }}
        className="fixed bottom-6 right-6 z-50 flex h-20 w-20 items-center justify-center transition hover:scale-110 animate-bounce"
      >
        <Image
          src="/character_1.png"
          alt="Character 1"
          width={80}
          height={80}
          className="h-20 w-20 object-contain drop-shadow-[0_10px_20px_rgba(34,211,238,0.35)]"
          priority
        />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Speech bubble */}
      {open && (
        <div className="relative w-72 max-w-[calc(100vw-3rem)] rounded-3xl border border-cyan-400/20 bg-slate-900/95 p-5 shadow-2xl shadow-cyan-500/10 backdrop-blur-md">
          {/* Close */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:text-white transition"
            aria-label="Close"
          >
            ✕
          </button>

          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Image
              src="/character_1.png"
              alt="Character 1"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            <span className="text-xs font-bold text-cyan-300 uppercase tracking-widest">
              {locale === "en" ? "P-Bot" : "小P"}
            </span>
            <span className="ml-auto h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          </div>

          {/* Tip text */}
          {onboardingActive ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300/90">
                {locale === "en" ? "First Login Tour" : "首次登入導覽"}
              </p>
              <p className="mt-2 text-base font-semibold text-white">
                {locale === "en" ? onboardingStep.enTitle : onboardingStep.zhTitle}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white">
                {locale === "en" ? onboardingStep.enDesc : onboardingStep.zhDesc}
              </p>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-white">
              {tips[tipIndex]}
            </p>
          )}

          {/* Navigation */}
          {onboardingActive ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  router.push(onboardingStep.path);
                }}
                className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
              >
                {locale === "en" ? "Open page" : "打開頁面"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onboardingStepIndex === 0) {
                    return;
                  }

                  const previousIndex = onboardingStepIndex - 1;
                  setOnboardingStepIndex(previousIndex);
                  router.push(ONBOARDING_STEPS[previousIndex].path);
                }}
                disabled={onboardingStepIndex === 0}
                className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {locale === "en" ? "Back" : "上一步"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onboardingStepIndex >= ONBOARDING_STEPS.length - 1) {
                    completeOnboarding();
                    return;
                  }

                  const nextIndex = onboardingStepIndex + 1;
                  setOnboardingStepIndex(nextIndex);
                  router.push(ONBOARDING_STEPS[nextIndex].path);
                }}
                className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
              >
                {onboardingStepIndex >= ONBOARDING_STEPS.length - 1
                  ? locale === "en" ? "Finish" : "完成"
                  : locale === "en" ? "Next" : "下一步"}
              </button>
              <button
                type="button"
                onClick={completeOnboarding}
                className="ml-auto text-xs text-slate-400 transition hover:text-slate-200"
              >
                {locale === "en" ? "Skip" : "略過"}
              </button>
            </div>
          ) : tips.length > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-1">
                {tips.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === tipIndex ? "w-4 bg-cyan-400" : "w-1.5 bg-white/20"}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setTipIndex((prev) => (prev + 1) % tips.length)}
                className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
              >
                {locale === "en" ? "Next tip →" : "下一個 →"}
              </button>
            </div>
          )}

          {/* Tail */}
          <div className="absolute -bottom-2 right-6 h-4 w-4 rotate-45 border-b border-r border-cyan-400/20 bg-slate-900/95" />
        </div>
      )}

      {/* Avatar button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Toggle guide"
        className="relative flex h-20 w-20 items-center justify-center transition hover:scale-110"
        style={{ animation: open ? "none" : "mascot-bounce 2s ease-in-out infinite" }}
      >
        <Image
          src="/character_1.png"
          alt="Character 1"
          width={80}
          height={80}
          className="h-20 w-20 object-contain drop-shadow-[0_10px_20px_rgba(34,211,238,0.35)]"
        />
        {!open && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400 text-[9px] font-bold text-slate-950">
            {onboardingActive ? ONBOARDING_STEPS.length - onboardingStepIndex : tips.length}
          </span>
        )}
      </button>

      {/* Hide button */}
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="text-xs text-slate-500 hover:text-slate-300 transition"
      >
        {locale === "en" ? "hide" : "隱藏"}
      </button>
    </div>
  );
}
