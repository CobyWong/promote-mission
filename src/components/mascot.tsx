"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import type { Locale } from "@/lib/i18n";
import type { Theme } from "@/lib/theme";

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
    zhDesc: "可在此查看 Coins、提交狀態與任務進度，為每日常用頁面。",
    enDesc: "Check your Coins, submission status, and progress. This is your daily command center.",
  },
  {
    path: "/missions",
    zhTitle: "任務中心 Missions",
    enTitle: "Missions",
    zhDesc: "接受任務前請先確認 requirements 與 deliverables，以降低退件風險。",
    enDesc: "Review requirements and deliverables before accepting to avoid rework.",
  },
  {
    path: "/rewards",
    zhTitle: "獎賞商城 Rewards",
    enTitle: "Rewards",
    zhDesc: "可使用 Coins 兌換獎賞，並請留意庫存與所需 Coins。",
    enDesc: "Redeem your Coins for rewards. Watch stock and required Coins.",
  },
  {
    path: "/leaderboard",
    zhTitle: "排行榜 Leaderboard",
    enTitle: "Leaderboard",
    zhDesc: "可追蹤本月排名並爭取晉升，第一名可獲每月大獎。",
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
    { zh: "你好，我是小P，你的任務嚮導。完成任務即可賺取金幣並兌換獎賞。", en: "Hey! I'm P-Bot, your mission guide! Complete missions to earn Coins and redeem rewards!" },
    { zh: "如欲開始，請前往「任務中心」選擇適合的品牌任務。", en: "Ready to start? Head to Missions and pick a brand task you like!" },
  ],
  "/missions": [
    { zh: "此處提供可接受任務；建議先閱讀任務要求後再接受。", en: "All available missions are here! Click one to read the brief before accepting." },
    { zh: "任務難度越高，金幣獎勵通常越高；請按內容能力選擇。", en: "Higher difficulty = more Coins! Choose wisely." },
  ],
  "/rewards": [
    { zh: "可於此使用金幣兌換獎賞；請留意庫存狀態。", en: "Spend your Coins here on rewards! Watch the stock — first come, first served!" },
    { zh: "如金幣不足，建議先完成更多任務。", en: "Not enough Coins? Go complete more missions first!" },
  ],
  "/leaderboard": [
    { zh: "本月金幣收益第一名需同時達成總 Like 200,000，方可獲名錶獎勵。", en: "This month, #1 by Coins must also reach 200,000 total likes to unlock the luxury watch." },
    { zh: "排行榜亦涵蓋完成任務數量與追蹤數，不僅限於金幣。", en: "Rankings also track missions done and followers — not just Coins!" },
  ],
  "/dashboard": [
    { zh: "此處為你的個人控制台，可追蹤任務進度與提交記錄。", en: "This is your personal dashboard — track your missions and submission history!" },
    { zh: "如提交仍在審核中，待審核通過後將自動入帳。", en: "Submissions pending? Sit tight — Coins land as soon as you're approved!" },
  ],
  "/login": [
    { zh: "登入後即可接受任務、累積金幣並兌換獎賞。", en: "Log in to start accepting missions, earning Coins, and redeeming rewards!" },
  ],
  "/register": [
    { zh: "歡迎加入。建立帳號後即可立即開始接受任務。", en: "Join us! Create an account and start accepting missions right away!" },
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
        { zh: "請先確認任務要求，尤其 Deliverables，確保內容符合規範後再接受。", en: "Read the deliverables carefully before accepting — make sure your content fits!" },
        { zh: "接受任務後倒數就開始，記得準時提交！", en: "The countdown starts the moment you accept — don't miss the deadline!" },
      ];
      return locale === "en" ? missionTips.map((t) => t.en) : missionTips.map((t) => t.zh);
    }
    if (prefix === "/submit") {
      const submitTips = [
        { zh: "提交時請填寫 Reel 連結，並將 @missionone_hk 設為協作者。", en: "Submit with your Reel URL and add @missionone_hk as collaborator." },
        { zh: "請再次確認品牌標註與 hashtag，可提升審核效率。", en: "Double-check brand tags and hashtags to speed up review." },
      ];
      return locale === "en" ? submitTips.map((t) => t.en) : submitTips.map((t) => t.zh);
    }
    return locale === "en" ? tips.map((t) => t.en) : tips.map((t) => t.zh);
  }

  // Default
  const defaultTips = [
    { zh: "如有任何問題，我是小P，隨時為你提供協助。", en: "Need help? I'm P-Bot, always here for you!" },
  ];
  return locale === "en" ? defaultTips.map((t) => t.en) : defaultTips.map((t) => t.zh);
}

export function Mascot({ locale, userId, theme }: { locale: Locale; userId?: string | null; theme: Theme }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [onboardingActive, setOnboardingActive] = useState(false);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);

  const tips = getTips(pathname, locale);
  const onboardingStep = ONBOARDING_STEPS[onboardingStepIndex];
  const isDark = theme === "dark";

  const overlayClass = isDark ? "bg-slate-950/55" : "bg-slate-900/30";
  const bubbleClass = isDark
    ? "border-cyan-400/20 bg-slate-900/95 shadow-cyan-500/10"
    : "border-slate-300 bg-white/95 shadow-slate-400/20";
  const closeButtonClass = isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900";
  const nameClass = isDark ? "text-cyan-300" : "text-slate-700";
  const tourLabelClass = isDark ? "text-cyan-300/90" : "text-slate-600";
  const titleClass = isDark ? "text-white" : "text-slate-900";
  const bodyClass = isDark ? "text-slate-100" : "text-slate-700";
  const neutralButtonClass = isDark
    ? "border-white/20 bg-white/5 text-slate-200 hover:bg-white/10"
    : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200";
  const primaryButtonClass = isDark
    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20"
    : "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200";
  const dotInactiveClass = isDark ? "bg-white/20" : "bg-slate-300";
  const tailClass = isDark ? "border-cyan-400/20 bg-slate-900/95" : "border-slate-300 bg-white/95";

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

  // Hard lock the UI while onboarding is active
  useEffect(() => {
    if (!onboardingActive) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [onboardingActive]);

  useEffect(() => {
    if (onboardingActive) {
      setOpen(true);
      setVisible(true);
    }
  }, [onboardingActive]);

  // In normal mode, do not render NPC at all.
  if (!onboardingActive) {
    return null;
  }

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
    <>
      {onboardingActive ? (
        <div
          className={`fixed inset-0 z-[70] ${overlayClass}`}
          aria-hidden="true"
        />
      ) : null}

      <div className="fixed bottom-6 right-6 z-[80] flex flex-col items-end gap-3">
      {/* Speech bubble */}
      {open && (
        <div className={`relative w-[24rem] max-w-[calc(100vw-2rem)] min-h-[14rem] rounded-3xl border p-6 shadow-2xl backdrop-blur-md ${bubbleClass}`}>
          {/* Close */}
          {!onboardingActive ? (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full transition ${closeButtonClass}`}
              aria-label="Close"
            >
              ✕
            </button>
          ) : null}

          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Image
              src="/character_1.png"
              alt="Character 1"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            <span className={`text-xs font-bold uppercase tracking-widest ${nameClass}`}>
              {locale === "en" ? "P-Bot" : "小P"}
            </span>
            <span className="ml-auto h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          </div>

          {/* Tip text */}
          {onboardingActive ? (
            <>
              <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${tourLabelClass}`}>
                {locale === "en" ? "First Login Tour" : "首次登入導覽"}
              </p>
              <p className={`mt-2 text-lg font-semibold leading-snug ${titleClass}`}>
                {locale === "en" ? onboardingStep.enTitle : onboardingStep.zhTitle}
              </p>
              <p className={`mt-2 text-base leading-relaxed ${bodyClass}`}>
                {locale === "en" ? onboardingStep.enDesc : onboardingStep.zhDesc}
              </p>
            </>
          ) : (
            <p className={`text-sm leading-relaxed ${bodyClass}`}>
              {tips[tipIndex]}
            </p>
          )}

          {/* Navigation */}
          {onboardingActive ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
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
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${neutralButtonClass}`}
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
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${primaryButtonClass}`}
              >
                {onboardingStepIndex >= ONBOARDING_STEPS.length - 1
                  ? locale === "en" ? "Finish" : "完成"
                  : locale === "en" ? "Next" : "下一步"}
              </button>
            </div>
          ) : tips.length > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-1">
                {tips.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === tipIndex ? "w-4 bg-cyan-400" : `w-1.5 ${dotInactiveClass}`}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setTipIndex((prev) => (prev + 1) % tips.length)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${primaryButtonClass}`}
              >
                {locale === "en" ? "Next tip →" : "下一個 →"}
              </button>
            </div>
          )}

          {/* Tail */}
          <div className={`absolute -bottom-2 right-6 h-4 w-4 rotate-45 border-b border-r ${tailClass}`} />
        </div>
      )}

      {/* Avatar button */}
      <button
        type="button"
        onClick={() => {
          if (onboardingActive) {
            return;
          }

          setOpen((prev) => !prev);
        }}
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
      {!onboardingActive ? (
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="text-xs text-slate-500 hover:text-slate-300 transition"
        >
          {locale === "en" ? "hide" : "隱藏"}
        </button>
      ) : null}
      </div>
    </>
  );
}
