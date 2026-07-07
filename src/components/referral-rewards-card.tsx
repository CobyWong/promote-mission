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
  const stageProgress = Math.min(100, Math.round((effectiveInvitedCount / rewardTiers[rewardTiers.length - 1].invited) * 100));
  const funnelInvited = center?.funnel.invited ?? effectiveInvitedCount;
  const funnelRegistered = center?.funnel.registered ?? 0;
  const funnelSubmitted = center?.funnel.firstSubmission ?? 0;
  const funnelApproved = center?.funnel.firstApproved ?? 0;
  const funnelRewarded = center?.funnel.rewarded ?? effectivePaidBatches;
  const funnelPending = center?.funnel.pendingReview ?? 0;

  function ratio(current: number, total: number) {
    if (total <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round((current / total) * 100)));
  }

  const regRate = ratio(funnelRegistered, funnelInvited);
  const submitRate = ratio(funnelSubmitted, Math.max(funnelRegistered, 1));
  const approveRate = ratio(funnelApproved, Math.max(funnelSubmitted, 1));
  const rewardRate = ratio(funnelRewarded, Math.max(funnelApproved, 1));
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
      funnelTitle: "Quest funnel",
      reminder: "Remind pending referrals",
      reminderSending: "Sending...",
      reminderResult: "Reminders sent",
      growthTitle: "Power-ups",
      shareTitle: "Share arsenal",
      copyLink: "Copy invite link",
      copyWhatsApp: "Copy WhatsApp text",
      copyTelegram: "Copy Telegram text",
      copyInstagram: "Copy Instagram text",
      leaderboardTitle: "Season arena",
      leaderboardMore: "See full board",
      nextMilestone: "Next milestone",
      noMilestone: "All milestones completed",
      missionTrack: "Mission track",
      tier: "Tier",
      toNext: "to next tier",
      commandDeck: "Referral Command Deck",
      combo: "Weekly combo",
      loading: "Syncing data...",
      noData: "No competitors yet.",
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
      funnelTitle: "任務漏斗",
      reminder: "提醒未完成朋友",
      reminderSending: "傳送中...",
      reminderResult: "已送出提醒",
      growthTitle: "成長強化",
      shareTitle: "分享武器庫",
      copyLink: "複製邀請連結",
      copyWhatsApp: "複製 WhatsApp 文案",
      copyTelegram: "複製 Telegram 文案",
      copyInstagram: "複製 Instagram 文案",
      leaderboardTitle: "推薦競技場",
      leaderboardMore: "查看完整榜單",
      nextMilestone: "下一里程碑",
      noMilestone: "已完成全部里程碑",
      missionTrack: "關卡軌道",
      tier: "段位",
      toNext: "升級尚欠",
      commandDeck: "推薦指揮台",
      combo: "每週連擊",
      loading: "同步資料中...",
      noData: "暫時未有對手上榜。",
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

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="tactical-subcard px-5 py-4">
            <h3 className="text-base font-semibold text-slate-100">{t.funnelTitle}</h3>
            <div className="mt-3 space-y-3 text-sm text-slate-300">
              {[
                { label: "Invited", value: funnelInvited, rate: 100 },
                { label: "Registered", value: funnelRegistered, rate: regRate },
                { label: "Submitted", value: funnelSubmitted, rate: submitRate },
                { label: "Approved", value: funnelApproved, rate: approveRate },
                { label: "Rewarded", value: funnelRewarded, rate: rewardRate },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between gap-2">
                    <p>{row.label}: <span className="font-semibold text-slate-100">{row.value}</span></p>
                    <p className="text-xs text-cyan-200">{row.rate}%</p>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-700/70">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300" style={{ width: `${row.rate}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs text-amber-200">
              <span>In review: {funnelPending}</span>
              <button
                type="button"
                onClick={sendReminders}
                disabled={sendingReminder}
                className="tactical-btn-ghost px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingReminder ? t.reminderSending : t.reminder}
              </button>
            </div>
            {reminderResult !== null ? <p className="mt-2 text-xs text-cyan-200">{t.reminderResult}: {reminderResult}</p> : null}
          </div>

          <div className="tactical-subcard px-5 py-4">
            <h3 className="text-base font-semibold text-slate-100">{t.growthTitle}</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
                <p className="text-xs text-slate-300">{t.combo}</p>
                <p className="mt-1 text-xl font-bold text-cyan-200">{center?.growth.streak7d ?? 0}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
                <p className="text-xs text-slate-300">Season</p>
                <p className="mt-1 text-xl font-bold text-slate-100">{center?.growth.rewardedThisSeason ?? 0}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
                <p className="text-xs text-slate-300">Milestone</p>
                <p className="mt-1 text-xl font-bold text-amber-200">
                  {center?.growth.nextMilestone ? center.growth.nextMilestone : "MAX"}
                </p>
              </div>
            </div>

            <p className="mt-3 text-sm text-slate-300">
              {t.nextMilestone}: <span className="font-semibold text-amber-200">
                {center?.growth.nextMilestone
                  ? `${center.growth.nextMilestone} (${center.growth.nextMilestoneRemaining} ${t.toNext})`
                  : t.noMilestone}
              </span>
            </p>

            <h3 className="mt-5 text-base font-semibold text-slate-100">{t.shareTitle}</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
            <p className="mt-3 text-sm text-slate-400">{t.loading}</p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {(center?.leaderboard ?? []).slice(0, 3).map((item) => (
                <div key={`${item.rank}-${item.name}`} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                  <p className={`text-xs font-bold ${item.rank === 1 ? "text-amber-200" : item.rank === 2 ? "text-cyan-200" : "text-emerald-200"}`}>#{item.rank}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-100">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-300">{item.rewardedInvites} invites</p>
                </div>
              ))}
              {(center?.leaderboard ?? []).length === 0 ? <p className="text-sm text-slate-400">{t.noData}</p> : null}
            </div>
          )}
        </div>

        <Link href="/referrals/leaderboard" className="tactical-link mt-6 inline-flex text-lg">
          {t.details} {"->"}
        </Link>
      </div>
    </section>
  );
}
