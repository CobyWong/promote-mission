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

  const effectiveInvitedCount = invitedCount;
  const effectivePaidBatches = paidBatches;

  const activeTier =
    rewardTiers.findLast((tier) => effectiveInvitedCount >= tier.invited) ?? rewardTiers[0];
  const nextTier = rewardTiers.find((tier) => tier.invited > effectiveInvitedCount) ?? null;
  const progressTarget = nextTier?.invited ?? rewardTiers[rewardTiers.length - 1].invited;
  const progressPercent = Math.min(100, Math.round((effectiveInvitedCount / progressTarget) * 100));
  const stageProgress = Math.min(100, Math.round((effectiveInvitedCount / rewardTiers[rewardTiers.length - 1].invited) * 100));
  const tierLabel = effectiveInvitedCount >= 20 ? "MASTER" : effectiveInvitedCount >= 10 ? "ELITE" : "ROOKIE";

  const t = locale === "en"
    ? {
      title: "Invite creators, earn rewards",
      subtitle: "Run your referral squad like a game season and climb tier rewards.",
      yourCode: "Your referral code",
      invited: "Invited",
      batches: "Rewarded invites",
      reward: "Rewards earned",
      details: "Open full leaderboard",
      progress: "Invite progress",
      currentTier: "Current tier",
      nextTier: "Next tier",
      unlocked: "Unlocked max tier",
      copy: "Copy",
      copied: "Copied",
      missionTrack: "Mission track",
      tier: "Tier",
      toNext: "to next tier",
      commandDeck: "Referral Command Deck",
    }
    : {
      title: "推薦戰場",
      subtitle: "用遊戲方式經營你嘅推薦隊伍，衝刺季榜同里程碑獎勵。",
      yourCode: "你的推薦碼",
      invited: "已推薦",
      batches: "已派獎推薦",
      reward: "已賺取獎勵",
      details: "查看完整季榜",
      progress: "推進進度",
      currentTier: "目前等級",
      nextTier: "下一級",
      unlocked: "已解鎖最高等級",
      copy: "複製",
      copied: "已複製",
      missionTrack: "關卡軌道",
      tier: "段位",
      toNext: "升級尚欠",
      commandDeck: "推薦指揮台",
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
    <section className="tactical-card mt-8 overflow-hidden p-0">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_15%_20%,rgba(142,165,106,0.24),transparent_35%),radial-gradient(circle_at_90%_15%,rgba(129,177,206,0.3),transparent_32%),linear-gradient(180deg,rgba(24,35,48,0.95),rgba(20,29,40,0.92))] px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">{t.commandDeck}</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-100">{t.title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">{t.subtitle}</p>
          </div>

          <div className="rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200">{t.tier}</p>
            <p className="mt-1 text-2xl font-bold text-amber-200">{tierLabel}</p>
            <p className="text-xs text-slate-300">{t.currentTier}: {activeTier.invited}+</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-300">{t.invited}</p>
            <p className="mt-2 text-3xl font-bold text-slate-100">{effectiveInvitedCount}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-300">{t.batches}</p>
            <p className="mt-2 text-3xl font-bold text-slate-100">{effectivePaidBatches}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-300">{t.reward}</p>
            <p className="mt-2 text-3xl font-bold text-amber-200">{totalRewardCoins.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-300">{t.yourCode}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xl font-bold tracking-[0.08em] text-cyan-200">{referralCode}</p>
              <button
                type="button"
                onClick={() => copyText(referralCode)}
                className="tactical-btn-ghost px-3 py-1 text-xs"
                title={copied ? t.copied : t.copy}
                aria-label={copied ? t.copied : t.copy}
              >
                {copied ? t.copied : t.copy}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-8 sm:py-6">
        <div className="tactical-subcard px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
            <p className="font-semibold text-slate-200">{t.missionTrack}</p>
            <p>
              {effectiveInvitedCount}/{progressTarget} · {progressPercent}%
            </p>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700/80">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-amber-300 transition-all" style={{ width: `${stageProgress}%` }} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 text-xs">
            {rewardTiers.map((tier) => {
              const unlocked = effectiveInvitedCount >= tier.invited;
              return (
                <div key={tier.invited} className={`rounded-full border px-3 py-1 ${unlocked ? "border-amber-300/40 bg-amber-300/10 text-amber-200" : "border-white/20 bg-white/5 text-slate-300"}`}>
                  {tier.invited}+ / +{tier.coinsPerBatch}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
            <p>{t.currentTier}: <span className="font-semibold text-amber-200">{activeTier.invited}+ · {activeTier.coinsPerBatch} {locale === "en" ? "Coins/batch" : "金幣/批次"}</span></p>
            <p>
              {nextTier
                ? `${t.nextTier}: ${nextTier.invited}+ · ${nextTier.coinsPerBatch} ${locale === "en" ? "Coins/batch" : "金幣/批次"} (${nextTier.invited - effectiveInvitedCount} ${t.toNext})`
                : t.unlocked}
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
