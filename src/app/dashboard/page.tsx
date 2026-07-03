import Link from "next/link";

import { DashboardMissionActions } from "@/components/dashboard-mission-actions";
import { ReferralRewardsCard } from "@/components/referral-rewards-card";
import { SupportContactForm } from "@/components/support-contact-form";
import { rewards } from "@/lib/data";
import { getDashboardData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";
import { getSupportEmail, getSupportWhatsappUrl } from "@/lib/supabase/env";

function getReferralCode(seed?: string | null) {
  const source = (seed ?? "missionone").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const normalized = source.length >= 8 ? source : `${source}MISSIONONE`;
  return normalized.slice(0, 8);
}

export default async function DashboardPage() {
  const locale = await getCurrentLocale();
  const t = locale === "en"
    ? {
      title: "Player Hub",
      unauthTitle: "Log in to enter your Player Hub",
      unauthDesc: "After enabling Supabase, this page shows your player stats, rewards, active quests, and support channel.",
      goLogin: "Go to login",
      createAccount: "Create account",
      subtitle: "Track your player stats, rewards, and active quests from one control room.",
      getMore: "Pick new quests",
      profileCenter: "Player Console",
      profileCardTitle: "Profile",
      followers: "Followers",
      joinedAt: "Joined",
      earningsTitle: "Reward Vault",
      earningsDesc: "Your lifetime rewards and current withdrawable balance.",
      totalEarned: "Total earned",
      availableToWithdraw: "Available to withdraw",
      withdrawnSoFar: "Withdrawn so far",
      recentWithdrawal: "Recent withdrawal",
      noWithdrawal: "No withdrawals yet.",
      activeMissions: "Active quests",
      pendingReviews: "Turn-ins pending review",
      demoNotice: "Showing demo data for now. After Supabase setup, this section will reflect your real player account.",
      due: "Quest window",
      reward: "Quest reward",
      viewBrief: "View quest brief →",
      nextReward: "Next loot unlock",
      pointsAway: "Only",
      pointsAwaySuffix: "Coins to claim",
    }
    : {
      title: "玩家基地",
      unauthTitle: "請先登入進入你嘅玩家基地",
      unauthDesc: "Supabase 啟用後，呢度會顯示你嘅玩家數據、收益、進行中關卡同客服聯絡。",
      goLogin: "前往登入",
      createAccount: "建立帳號",
      subtitle: "喺同一頁追蹤玩家進度、收益同進行中關卡。",
      getMore: "接新關卡",
      profileCenter: "玩家控制台",
      profileCardTitle: "個人資料",
      followers: "追蹤數",
      joinedAt: "加入時間",
      earningsTitle: "獎勵倉庫",
      earningsDesc: "顯示你嘅累計收益同目前可提現金額。",
      totalEarned: "累計收益",
      availableToWithdraw: "可提現",
      withdrawnSoFar: "已提現",
      recentWithdrawal: "最近提現",
      noWithdrawal: "未有提現紀錄。",
      activeMissions: "進行中關卡",
      pendingReviews: "待審核交件",
      demoNotice: "暫時顯示示範資料。設定 Supabase 後，呢度會改為你實際玩家帳號資料。",
      due: "關卡時窗",
      reward: "關卡獎勵",
      viewBrief: "查看關卡詳情 →",
      nextReward: "下一個可解鎖戰利品",
      pointsAway: "距離兌換只差",
      pointsAwaySuffix: "金幣",
    };

  const dashboard = await getDashboardData();
  const activeMissions = dashboard.activeMissions;
  const nextReward = rewards.find((reward) => reward.cost > dashboard.balance) ?? rewards[rewards.length - 1];
  const pointsToNextReward = Math.max(nextReward.cost - dashboard.balance, 0);
  const avatarInitial = dashboard.profile?.name?.trim().slice(0, 1).toUpperCase() ?? "C";
  const referralCode = getReferralCode(dashboard.userEmail);

  if (dashboard.mode === "unauthenticated") {
    return (
      <section className="section-shell py-12 sm:py-16">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-600">{t.profileCenter}</p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-900">{t.unauthTitle}</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            {t.unauthDesc}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/login" className="rounded-full bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700">
              {t.goLogin}
            </Link>
            <Link href="/register" className="rounded-full border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:border-slate-400">
              {t.createAccount}
            </Link>
          </div>
        </div>

        <div id="support-center" className="mt-8 mx-auto max-w-3xl scroll-mt-28">
          <SupportContactForm
            locale={locale}
            defaultEmail=""
            supportEmail={getSupportEmail()}
            supportWhatsappUrl={getSupportWhatsappUrl()}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="section-shell py-12 sm:py-16">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-blue-600">{t.profileCenter}</p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-900">{t.title}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            {t.subtitle}
          </p>
        </div>
        <Link href="/missions" className="rounded-full bg-blue-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-blue-700">
          {t.getMore}
        </Link>
      </div>

      <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-18 w-18 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-3xl font-semibold text-slate-700">
              {avatarInitial}
            </span>
            <div>
              <p className="text-2xl font-semibold text-slate-900">{dashboard.profile.name}</p>
              <p className="mt-1 text-slate-600">{dashboard.profile.handle}</p>
              <p className="mt-1 text-sm text-slate-500">{dashboard.userEmail ?? "-"}</p>
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.followers}</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{dashboard.profile.followers}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.joinedAt}</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{dashboard.profile.joinedAt}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.pendingReviews}</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{dashboard.pendingCount}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">{t.earningsTitle}</h2>
            <p className="mt-2 text-slate-600">{t.earningsDesc}</p>
          </div>
          <Link href="#support-center" className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
            {locale === "en" ? "Need help?" : "需要協助？"}
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.totalEarned}</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-600">HK${dashboard.totalEarned.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.availableToWithdraw}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">HK${dashboard.availableToWithdraw.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.withdrawnSoFar}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">HK${dashboard.withdrawnSoFar.toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.recentWithdrawal}</p>
          <p className="mt-2">{t.noWithdrawal}</p>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        {dashboard.mode === "demo" ? (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
            {t.demoNotice}
          </div>
        ) : null}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-slate-500">{dashboard.profile.platform} · {dashboard.profile.niche}</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{dashboard.profile.name} · {dashboard.profile.handle}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {locale === "en" ? "Followers" : "追蹤數"} {dashboard.profile.followers} · {locale === "en" ? "Joined" : "加入時間"} {dashboard.profile.joinedAt}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900">{t.activeMissions}</h2>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
            {t.pendingReviews}: {dashboard.pendingCount}
          </div>
        </div>

        {activeMissions.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-600">
            {locale === "en"
              ? "You don’t have any active quests yet. Accept a quest to start tracking progress here."
              : "你而家未有進行中關卡。先接受一個關卡，之後就會喺呢度顯示進度。"}
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-4">
              {activeMissions.map((mission) => {
                const submissionStatus = dashboard.missionStatusMap?.get(mission.slug);
                const statusColors: Record<string, string> = {
                    "Approved": "border-emerald-200 bg-emerald-50 text-emerald-700",
                    "Pending": "border-blue-200 bg-blue-50 text-blue-700",
                    "Needs edits": "border-amber-200 bg-amber-50 text-amber-700",
                };
                const submissionStatusLabel = locale === "en"
                  ? submissionStatus
                  : submissionStatus === "Approved"
                    ? "已批准"
                    : submissionStatus === "Pending"
                      ? "待審核"
                      : submissionStatus === "Needs edits"
                        ? "需修改"
                        : submissionStatus;
                const statusColor = submissionStatus ? statusColors[submissionStatus] || statusColors["Pending"] : "";

                return <div key={mission.slug} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm text-blue-700">{mission.brand}</p>
                        {submissionStatus ? (
                          <span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusColor}`}>
                            {submissionStatusLabel}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-2 text-xl font-semibold text-slate-900">{mission.title}</h3>
                      <p className="mt-2 text-sm text-slate-500">{t.due}：{mission.eta} · {t.reward}：{mission.points} {locale === "en" ? "Coins" : "金幣"}</p>
                    </div>
                    <div className="flex gap-3 text-sm font-semibold">
                      <Link href={`/missions/${mission.slug}`} className="text-blue-600 hover:text-blue-700">
                        {t.viewBrief}
                      </Link>
                      <DashboardMissionActions missionSlug={mission.slug} eta={mission.eta} locale={locale} />
                    </div>
                  </div>
                </div>;
              })}
            </div>

            <div className="mt-8 rounded-[1.5rem] border border-blue-200 bg-blue-50 p-5">
              <p className="text-sm text-blue-700">{t.nextReward}</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{nextReward.name}</p>
              <p className="mt-2 text-sm text-slate-600">{t.pointsAway} {pointsToNextReward} {t.pointsAwaySuffix}</p>
            </div>
          </>
        )}
      </div>

      <ReferralRewardsCard
        locale={locale}
        referralCode={referralCode}
        invitedCount={0}
        paidBatches={0}
        totalRewardHkd={0}
      />

      <div id="support-center" className="mt-8 scroll-mt-28">
        <SupportContactForm
          locale={locale}
          defaultEmail={dashboard.userEmail ?? ""}
          supportEmail={getSupportEmail()}
          supportWhatsappUrl={getSupportWhatsappUrl()}
        />
      </div>
    </section>
  );
}
