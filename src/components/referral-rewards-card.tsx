"use client";

import { useState } from "react";

type ReferralRewardsCardProps = {
  locale: "zh-HK" | "en";
  referralCode: string;
  invitedCount: number;
  totalRewardCoins: number;
};

export function ReferralRewardsCard({
  locale,
  referralCode,
  invitedCount,
  totalRewardCoins,
}: ReferralRewardsCardProps) {
  const [copied, setCopied] = useState(false);
  const rewardPerReferral = 200;
  const displayRewardCoins = Math.max(totalRewardCoins, invitedCount * rewardPerReferral);

  const t = locale === "en"
    ? {
      title: "Invite creators, earn rewards",
      subtitle: "Each successfully qualified referral gives you 200 Coins.",
      yourCode: "Your referral code",
      invited: "Invited",
      reward: "Rewards earned",
      copy: "Copy",
      copied: "Copied",
    }
    : {
      title: "邀請創作者，賺取獎勵",
      subtitle: "每位成功達資格的推薦用戶，你可獲得 200 金幣。",
      yourCode: "你的推薦碼",
      invited: "已推薦",
      reward: "已賺取獎勵",
      copy: "複製",
      copied: "已複製",
    };

  async function copyText(value: string) {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }


  return (
    <section className="tactical-card mt-6 p-4 sm:mt-8 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-amber-300/50 bg-amber-300/10 text-amber-200 sm:h-12 sm:w-12">
          <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6" aria-hidden="true">
            <path d="M10 3.5v13M3.5 10h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <rect x="4" y="6" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </span>

        <div>
          <h2 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{t.title}</h2>
          <p className="mt-2 text-sm text-slate-400 sm:text-base">{t.subtitle}</p>
        </div>
      </div>

      <div className="tactical-subcard mt-5 px-4 py-4 sm:mt-6 sm:px-5">
        <p className="text-sm text-slate-400">{t.yourCode}</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-3xl font-bold tracking-[0.08em] text-amber-200 sm:text-4xl sm:tracking-[0.1em]">{referralCode}</p>
          <button
            type="button"
            onClick={() => copyText(referralCode)}
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

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="tactical-subcard px-5 py-4">
          <p className="text-sm text-slate-400">{t.invited}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100 sm:text-3xl">{invitedCount}</p>
        </div>

        <div className="tactical-subcard px-5 py-4">
          <p className="text-sm text-slate-400">{t.reward}</p>
          <p className="mt-2 text-2xl font-semibold text-amber-200 sm:text-3xl">{displayRewardCoins.toLocaleString()} {locale === "en" ? "Coins" : "金幣"}</p>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-300">
        {locale === "en" ? `Reward rule: ${rewardPerReferral} Coins per successful referral` : `獎勵規則：每位成功推薦 +${rewardPerReferral} 金幣`}
      </p>
    </section>
  );
}
