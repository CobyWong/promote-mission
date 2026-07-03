"use client";

import { useState } from "react";

type ReferralRewardsCardProps = {
  locale: "zh-HK" | "en";
  referralCode: string;
  invitedCount: number;
  paidBatches: number;
  totalRewardHkd: number;
};

export function ReferralRewardsCard({
  locale,
  referralCode,
  invitedCount,
  paidBatches,
  totalRewardHkd,
}: ReferralRewardsCardProps) {
  const [copied, setCopied] = useState(false);

  const t = locale === "en"
    ? {
      title: "Invite creators, earn rewards",
      subtitle: "When 3 invited creators join, publish videos, and complete their first payout, you receive a reward.",
      yourCode: "Your referral code",
      invited: "Invited",
      batches: "Paid batches",
      reward: "Rewards earned",
      details: "Reward batches",
      copy: "Copy",
      copied: "Copied",
    }
    : {
      title: "邀請創作者，賺取獎勵",
      subtitle: "當 3 位推薦的創作者加入、發佈短片並完成首次提款後，你便可領取獎勵。",
      yourCode: "你的推薦碼",
      invited: "已推薦",
      batches: "已領取批次",
      reward: "已賺取獎勵",
      details: "獎勵批次",
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
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6" aria-hidden="true">
            <path d="M10 3.5v13M3.5 10h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <rect x="4" y="6" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </span>

        <div>
          <h2 className="text-3xl font-semibold text-slate-900">{t.title}</h2>
          <p className="mt-2 text-base text-slate-500">{t.subtitle}</p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
        <p className="text-sm text-slate-500">{t.yourCode}</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-4xl font-bold tracking-[0.1em] text-blue-600">{referralCode}</p>
          <button
            type="button"
            onClick={handleCopy}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-slate-700 transition hover:bg-slate-300"
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
        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-sm text-slate-500">{t.invited}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{invitedCount}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-sm text-slate-500">{t.batches}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{paidBatches}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-sm text-slate-500">{t.reward}</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-600">HK${totalRewardHkd.toFixed(2)}</p>
        </div>
      </div>

      <button type="button" className="mt-6 text-lg font-semibold text-blue-600 hover:text-blue-700">
        {t.details} &rarr;
      </button>
    </section>
  );
}
