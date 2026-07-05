"use client";

import { useState } from "react";

type ReferralRewardsCardProps = {
  locale: "zh-HK" | "en";
  referralCode: string;
  invitedCount: number;
  paidBatches: number;
  totalRewardCoins: number;
};

export function ReferralRewardsCard({
  locale,
  referralCode,
  invitedCount,
  paidBatches,
  totalRewardCoins,
}: ReferralRewardsCardProps) {
  const [copied, setCopied] = useState(false);

  const rewardTiers = [
    { invited: 3, coinsPerBatch: 300 },
    { invited: 10, coinsPerBatch: 500 },
    { invited: 20, coinsPerBatch: 800 },
  ];

  const activeTier =
    rewardTiers.findLast((tier) => invitedCount >= tier.invited) ?? rewardTiers[0];
  const nextTier = rewardTiers.find((tier) => tier.invited > invitedCount) ?? null;
  const progressTarget = nextTier?.invited ?? rewardTiers[rewardTiers.length - 1].invited;
  const progressPercent = Math.min(100, Math.round((invitedCount / progressTarget) * 100));

  const t = locale === "en"
    ? {
      title: "Invite creators, earn rewards",
      subtitle: "Invite more friends to unlock higher referral reward tiers. More invited creators means more Coins per reward batch.",
      yourCode: "Your referral code",
      invited: "Invited",
      batches: "Paid batches",
      reward: "Rewards earned",
      details: "Reward batches",
      progress: "Invite progress",
      currentTier: "Current tier",
      nextTier: "Next tier",
      unlocked: "Unlocked max tier",
      copy: "Copy",
      copied: "Copied",
    }
    : {
      title: "邀請創作者，賺取獎勵",
      subtitle: "邀請越多朋友，可解鎖更高推薦獎勵等級。推薦人數越高，每個獎勵批次可獲得更多金幣。",
      yourCode: "你的推薦碼",
      invited: "已推薦",
      batches: "已領取批次",
      reward: "已賺取獎勵",
      details: "獎勵批次",
      progress: "邀請進度",
      currentTier: "目前等級",
      nextTier: "下一級",
      unlocked: "已解鎖最高等級",
      copy: "複製",
      copied: "已複製",
    };

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="tactical-card mt-8 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-amber-300/50 bg-amber-300/10 text-amber-200">
          <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6" aria-hidden="true">
            <path d="M10 3.5v13M3.5 10h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <rect x="4" y="6" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </span>

        <div>
          <h2 className="text-3xl font-semibold text-slate-100">{t.title}</h2>
          <p className="mt-2 text-base text-slate-400">{t.subtitle}</p>
        </div>
      </div>

      <div className="tactical-subcard mt-6 px-4 py-4 sm:px-5">
        <p className="text-sm text-slate-400">{t.yourCode}</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-4xl font-bold tracking-[0.1em] text-amber-200">{referralCode}</p>
          <button
            type="button"
            onClick={handleCopy}
            className="tactical-btn-ghost flex h-12 w-12 shrink-0 rounded-xl"
            title={copied ? t.copied : t.copy}
            aria-label={copied ? t.copied : t.copy}
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
              <rect x="7" y="4" width="9" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4 7V16h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="tactical-subcard px-5 py-4">
          <p className="text-sm text-slate-400">{t.invited}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-100">{invitedCount}</p>
        </div>

        <div className="tactical-subcard px-5 py-4">
          <p className="text-sm text-slate-400">{t.batches}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-100">{paidBatches}</p>
        </div>

        <div className="tactical-subcard px-5 py-4">
          <p className="text-sm text-slate-400">{t.reward}</p>
          <p className="mt-2 text-3xl font-semibold text-amber-200">{totalRewardCoins.toLocaleString()} {locale === "en" ? "Coins" : "金幣"}</p>
        </div>
      </div>

      <div className="tactical-subcard mt-5 px-5 py-4">
        <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
          <p className="font-semibold text-slate-200">{t.progress}</p>
          <p>{invitedCount} / {progressTarget}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700/80">
          <div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
          <p>{t.currentTier}: <span className="font-semibold text-amber-200">{activeTier.invited}+ · {activeTier.coinsPerBatch} {locale === "en" ? "Coins/batch" : "金幣/批次"}</span></p>
          <p>
            {nextTier
              ? `${t.nextTier}: ${nextTier.invited}+ · ${nextTier.coinsPerBatch} ${locale === "en" ? "Coins/batch" : "金幣/批次"}`
              : t.unlocked}
          </p>
        </div>
      </div>

      <button type="button" className="tactical-link mt-6 text-lg">
        {t.details} &rarr;
      </button>
    </section>
  );
}
