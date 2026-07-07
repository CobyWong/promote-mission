"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ReferralRewardsCardProps = {
  locale: "zh-HK" | "en";
  referralCode: string;
  invitedCount: number;
  paidBatches: number;
  totalRewardCoins: number;
};

type ReferralCenterResponse = {
  funnel: {
    invited: number;
    registered: number;
    firstSubmission: number;
    firstApproved: number;
    rewarded: number;
    pendingReview: number;
  };
  growth: {
    streak7d: number;
    rewardedThisSeason: number;
    nextMilestone: number | null;
    nextMilestoneRemaining: number;
  };
  shareKit: {
    inviteUrl: string;
    whatsappText: string;
    telegramText: string;
    instagramCaption: string;
  };
  leaderboard: Array<{
    rank: number;
    name: string;
    rewardedInvites: number;
  }>;
};

export function ReferralRewardsCard({
  locale,
  referralCode,
  invitedCount,
  paidBatches,
  totalRewardCoins,
}: ReferralRewardsCardProps) {
  const [copied, setCopied] = useState(false);
  const [center, setCenter] = useState<ReferralCenterResponse | null>(null);
  const [loadingCenter, setLoadingCenter] = useState(true);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderResult, setReminderResult] = useState<number | null>(null);

  const rewardTiers = [
    { invited: 3, coinsPerBatch: 300 },
    { invited: 10, coinsPerBatch: 500 },
    { invited: 20, coinsPerBatch: 800 },
  ];

  const effectiveInvitedCount = center?.funnel.invited ?? invitedCount;
  const effectivePaidBatches = center?.funnel.rewarded ?? paidBatches;

  const activeTier =
    rewardTiers.findLast((tier) => effectiveInvitedCount >= tier.invited) ?? rewardTiers[0];
  const nextTier = rewardTiers.find((tier) => tier.invited > effectiveInvitedCount) ?? null;
  const progressTarget = nextTier?.invited ?? rewardTiers[rewardTiers.length - 1].invited;
  const progressPercent = Math.min(100, Math.round((effectiveInvitedCount / progressTarget) * 100));

  const t = locale === "en"
    ? {
      title: "Invite creators, earn rewards",
      subtitle: "Track referral conversion, send reminders, and push to higher bonus tiers.",
      yourCode: "Your referral code",
      invited: "Invited",
      batches: "Rewarded invites",
      reward: "Rewards earned",
      details: "Reward batches",
      progress: "Invite progress",
      currentTier: "Current tier",
      nextTier: "Next tier",
      unlocked: "Unlocked max tier",
      copy: "Copy",
      copied: "Copied",
      funnelTitle: "Conversion funnel",
      reminder: "Remind pending referrals",
      reminderSending: "Sending...",
      reminderResult: "Reminders sent",
      growthTitle: "Growth",
      shareTitle: "Share kit",
      copyLink: "Copy invite link",
      copyWhatsApp: "Copy WhatsApp text",
      copyTelegram: "Copy Telegram text",
      copyInstagram: "Copy Instagram text",
      leaderboardTitle: "Season leaderboard",
      leaderboardMore: "See full board",
      nextMilestone: "Next milestone",
      noMilestone: "All milestones completed",
    }
    : {
      title: "邀請創作者，賺取獎勵",
      subtitle: "追蹤推薦轉換、發送提醒，逐級解鎖更高推薦獎勵。",
      yourCode: "你的推薦碼",
      invited: "已推薦",
      batches: "已派獎推薦",
      reward: "已賺取獎勵",
      details: "獎勵批次",
      progress: "邀請進度",
      currentTier: "目前等級",
      nextTier: "下一級",
      unlocked: "已解鎖最高等級",
      copy: "複製",
      copied: "已複製",
      funnelTitle: "轉換漏斗",
      reminder: "提醒未完成朋友",
      reminderSending: "傳送中...",
      reminderResult: "已送出提醒",
      growthTitle: "成長進度",
      shareTitle: "Share Kit",
      copyLink: "複製邀請連結",
      copyWhatsApp: "複製 WhatsApp 文案",
      copyTelegram: "複製 Telegram 文案",
      copyInstagram: "複製 Instagram 文案",
      leaderboardTitle: "推薦季榜",
      leaderboardMore: "查看完整榜單",
      nextMilestone: "下一里程碑",
      noMilestone: "已完成全部里程碑",
    };

  useEffect(() => {
    let mounted = true;

    async function loadCenter() {
      try {
        const response = await fetch("/api/referrals/center", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as ReferralCenterResponse;
        if (mounted) {
          setCenter(data);
        }
      } finally {
        if (mounted) {
          setLoadingCenter(false);
        }
      }
    }

    void loadCenter();
    return () => {
      mounted = false;
    };
  }, []);

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

  async function sendReminders() {
    setSendingReminder(true);
    setReminderResult(null);

    try {
      const response = await fetch("/api/referrals/reminders", {
        method: "POST",
      });

      if (!response.ok) {
        setReminderResult(0);
        return;
      }

      const data = (await response.json()) as { sent?: number };
      setReminderResult(data.sent ?? 0);
    } catch {
      setReminderResult(0);
    } finally {
      setSendingReminder(false);
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

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="tactical-subcard px-5 py-4">
          <p className="text-sm text-slate-400">{t.invited}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-100">{effectiveInvitedCount}</p>
        </div>

        <div className="tactical-subcard px-5 py-4">
          <p className="text-sm text-slate-400">{t.batches}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-100">{effectivePaidBatches}</p>
        </div>

        <div className="tactical-subcard px-5 py-4">
          <p className="text-sm text-slate-400">{t.reward}</p>
          <p className="mt-2 text-3xl font-semibold text-amber-200">{totalRewardCoins.toLocaleString()} {locale === "en" ? "Coins" : "金幣"}</p>
        </div>
      </div>

      <div className="tactical-subcard mt-5 px-5 py-4">
        <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
          <p className="font-semibold text-slate-200">{t.progress}</p>
          <p>{effectiveInvitedCount} / {progressTarget}</p>
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

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <div className="tactical-subcard px-5 py-4">
          <h3 className="text-base font-semibold text-slate-100">{t.funnelTitle}</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-300">
            <p>Invited: <span className="font-semibold text-slate-100">{center?.funnel.invited ?? effectiveInvitedCount}</span></p>
            <p>Registered: <span className="font-semibold text-slate-100">{center?.funnel.registered ?? effectiveInvitedCount}</span></p>
            <p>Submitted: <span className="font-semibold text-slate-100">{center?.funnel.firstSubmission ?? 0}</span></p>
            <p>Approved: <span className="font-semibold text-slate-100">{center?.funnel.firstApproved ?? 0}</span></p>
            <p>Rewarded: <span className="font-semibold text-slate-100">{center?.funnel.rewarded ?? effectivePaidBatches}</span></p>
            <p>In review: <span className="font-semibold text-amber-200">{center?.funnel.pendingReview ?? 0}</span></p>
          </div>

          <button
            type="button"
            onClick={sendReminders}
            disabled={sendingReminder}
            className="tactical-btn-ghost mt-4 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sendingReminder ? t.reminderSending : t.reminder}
          </button>
          {reminderResult !== null ? <p className="mt-2 text-xs text-cyan-200">{t.reminderResult}: {reminderResult}</p> : null}
        </div>

        <div className="tactical-subcard px-5 py-4">
          <h3 className="text-base font-semibold text-slate-100">{t.growthTitle}</h3>
          <p className="mt-3 text-sm text-slate-300">7d streak count: <span className="font-semibold text-slate-100">{center?.growth.streak7d ?? 0}</span></p>
          <p className="mt-1 text-sm text-slate-300">Season rewards: <span className="font-semibold text-slate-100">{center?.growth.rewardedThisSeason ?? 0}</span></p>
          <p className="mt-1 text-sm text-slate-300">
            {t.nextMilestone}: <span className="font-semibold text-amber-200">
              {center?.growth.nextMilestone
                ? `${center.growth.nextMilestone} (${center.growth.nextMilestoneRemaining} left)`
                : t.noMilestone}
            </span>
          </p>

          <h3 className="mt-5 text-base font-semibold text-slate-100">{t.shareTitle}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="tactical-btn-ghost px-3 py-2 text-xs" onClick={() => copyText(center?.shareKit.inviteUrl ?? "")}>{t.copyLink}</button>
            <button type="button" className="tactical-btn-ghost px-3 py-2 text-xs" onClick={() => copyText(center?.shareKit.whatsappText ?? "")}>{t.copyWhatsApp}</button>
            <button type="button" className="tactical-btn-ghost px-3 py-2 text-xs" onClick={() => copyText(center?.shareKit.telegramText ?? "")}>{t.copyTelegram}</button>
            <button type="button" className="tactical-btn-ghost px-3 py-2 text-xs" onClick={() => copyText(center?.shareKit.instagramCaption ?? "")}>{t.copyInstagram}</button>
          </div>
        </div>
      </div>

      <div className="tactical-subcard mt-5 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-100">{t.leaderboardTitle}</h3>
          <Link href="/referrals/leaderboard" className="text-xs font-semibold text-cyan-200 hover:text-cyan-100">
            {t.leaderboardMore} {"->"}
          </Link>
        </div>

        {loadingCenter ? (
          <p className="mt-3 text-sm text-slate-400">Loading...</p>
        ) : (
          <div className="mt-3 space-y-2">
            {(center?.leaderboard ?? []).slice(0, 5).map((item) => (
              <div key={`${item.rank}-${item.name}`} className="flex items-center justify-between text-sm text-slate-300">
                <p>#{item.rank} {item.name}</p>
                <p className="font-semibold text-slate-100">{item.rewardedInvites}</p>
              </div>
            ))}
            {(center?.leaderboard ?? []).length === 0 ? <p className="text-sm text-slate-400">No data yet.</p> : null}
          </div>
        )}
      </div>

      <button type="button" className="tactical-link mt-6 text-lg">
        {t.details} {"->"}
      </button>
    </section>
  );
}
