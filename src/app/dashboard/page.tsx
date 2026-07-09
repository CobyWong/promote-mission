import Link from "next/link";

import { DashboardMissionActions } from "@/components/dashboard-mission-actions";
import { ReferralRewardsCard } from "@/components/referral-rewards-card";
import { SupportContactForm } from "@/components/support-contact-form";
import { getDashboardData, getRewardsCatalog } from "@/lib/backend";
import { getGamePassLevelRewardCoins } from "@/lib/game-pass";
import { getCurrentLocale } from "@/lib/i18n";
import { getLevelProgressFromTotalExp, getMissionTotalPrizeByDifficulty, MAX_CREATOR_LEVEL } from "@/lib/mission-rules";
import { getSupportEmail, getSupportWhatsappUrl } from "@/lib/supabase/env";

export default async function DashboardPage() {
  const locale = await getCurrentLocale();
  const t = locale === "en"
    ? {
      title: "Your creator profile",
      unauthTitle: "Log in to view your profile",
      unauthDesc: "After enabling Supabase, this page shows your profile, earnings, active missions, and support contact.",
      goLogin: "Go to login",
      createAccount: "Create account",
      subtitle: "Manage your creator profile, earnings, active missions, and support in one place.",
      getMore: "Get more missions",
      profileCenter: "Profile Center",
      profileCardTitle: "Profile",
      ageGroup: "Age group",
      followersRange: "Follower band",
      joinedAt: "Joined",
      earningsTitle: "Earnings",
      earningsDesc: "Your lifetime earnings and available balance.",
      totalEarned: "Total earned",
      availableToWithdraw: "Available to withdraw",
      withdrawnSoFar: "Withdrawn so far",
      recentWithdrawal: "Recent withdrawal",
      noWithdrawal: "No withdrawals yet.",
      activeMissions: "Active missions",
      pendingReviews: "Pending reviews",
      userId: "User ID",
      unavailableTitle: "Service setup required",
      unavailableDesc: "Dashboard data is unavailable until backend services are configured.",
      due: "Due",
      reward: "Reward",
      viewBrief: "View brief →",
      nextReward: "Next redeemable reward",
      pointsAway: "Only",
      pointsAwaySuffix: "Coins to redeem",
      referralHistory: "Referral reward history",
      referralStatus: "Status",
      referralReward: "Reward",
      referralEmpty: "No referral records yet.",
      statusInvited: "Invited",
      statusQualified: "Qualified",
      statusRewarded: "Rewarded",
      levelProgress: "Level progress",
      levelMaxed: "Max level reached",
      expToNext: "EXP to next level",
      totalExp: "Total EXP",
      nextLevelReward: "Next level reward",
    }
    : {
      title: "創作者個人檔案",
      unauthTitle: "請先登入以檢視個人檔案",
      unauthDesc: "啟用 Supabase 後，此頁將顯示你的個人資料、收益概況、進行中任務與客服聯絡方式。",
      goLogin: "前往登入",
      createAccount: "建立帳號",
      subtitle: "在同一頁面集中管理個人資料、收益、進行中任務與客服支援。",
      getMore: "探索更多任務",
      profileCenter: "個人檔案",
      profileCardTitle: "個人資料",
      ageGroup: "年齡組別",
      followersRange: "追蹤數區間",
      joinedAt: "加入時間",
      earningsTitle: "收益",
      earningsDesc: "顯示累計收益與可提現金額。",
      totalEarned: "累計收益",
      availableToWithdraw: "可提現",
      withdrawnSoFar: "已提現",
      recentWithdrawal: "最近提現",
      noWithdrawal: "未有提現紀錄。",
      activeMissions: "進行中任務",
      pendingReviews: "待審核提交",
      userId: "用戶編號",
      unavailableTitle: "服務尚未完成設定",
      unavailableDesc: "後端服務未完成設定前，儀表板資料暫時不可用。",
      due: "截止",
      reward: "獎勵",
      viewBrief: "查看詳情 →",
      nextReward: "下一個可兌換獎賞",
      pointsAway: "距離下一次兌換尚差",
      pointsAwaySuffix: "金幣",
      referralHistory: "推薦獎勵紀錄",
      referralStatus: "狀態",
      referralReward: "獎勵",
      referralEmpty: "暫時未有推薦紀錄。",
      statusInvited: "已邀請",
      statusQualified: "已達資格",
      statusRewarded: "已派獎",
      levelProgress: "等級進度",
      levelMaxed: "已達最高等級",
      expToNext: "升級尚欠 EXP",
      totalExp: "總 EXP",
      nextLevelReward: "下一級獎勵",
    };

  const dashboard = await getDashboardData();
  const rewardsCatalog = await getRewardsCatalog();
  const activeMissions = dashboard.activeMissions;
  const nextReward = rewardsCatalog.rewards.find((reward) => reward.cost > dashboard.balance)
    ?? rewardsCatalog.rewards[rewardsCatalog.rewards.length - 1]
    ?? null;
  const pointsToNextReward = nextReward ? Math.max(nextReward.cost - dashboard.balance, 0) : 0;
  const avatarInitial = dashboard.profile?.name?.trim().slice(0, 1).toUpperCase() ?? "C";
  const referralStatusLabel = (status: string) => {
    if (status === "Rewarded") return t.statusRewarded;
    if (status === "Qualified") return t.statusQualified;
    return t.statusInvited;
  };
  const approvedExp = dashboard.submissions
    .filter((item) => item.status === "Approved")
    .reduce((sum, item) => sum + Math.max(item.coins ?? 0, 0), 0);
  const levelProgress = getLevelProgressFromTotalExp(approvedExp);
  const nextLevelCoins = levelProgress.isMaxLevel ? 0 : getGamePassLevelRewardCoins(levelProgress.level + 1);

  if (dashboard.mode === "unavailable") {
    return (
      <section className="section-shell py-12 sm:py-16">
        <div className="tactical-card mx-auto max-w-3xl p-8 text-center">
          <p className="tactical-section-kicker">{t.profileCenter}</p>
          <h1 className="tactical-section-title">{t.unavailableTitle}</h1>
          <p className="tactical-section-lead mx-auto">
            {t.unavailableDesc}
          </p>
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

  if (dashboard.mode === "unauthenticated") {
    return (
      <section className="section-shell py-12 sm:py-16">
        <div className="tactical-card mx-auto max-w-3xl p-8 text-center">
          <p className="tactical-section-kicker">{t.profileCenter}</p>
          <h1 className="tactical-section-title">{t.unauthTitle}</h1>
          <p className="tactical-section-lead mx-auto">
            {t.unauthDesc}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/login" className="tactical-btn-primary px-6 py-3">
              {t.goLogin}
            </Link>
            <Link href="/register" className="tactical-btn-ghost px-6 py-3">
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
          <p className="tactical-section-kicker">{t.profileCenter}</p>
          <h1 className="tactical-section-title">{t.title}</h1>
          <p className="tactical-section-lead">
            {t.subtitle}
          </p>
        </div>
        <Link href="/missions" className="tactical-btn-primary px-6 py-3 text-center">
          {t.getMore}
        </Link>
      </div>

      <div className="tactical-card mt-10 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-18 w-18 items-center justify-center rounded-full border border-amber-300/40 bg-amber-300/10 text-3xl font-semibold text-amber-200">
              {avatarInitial}
            </span>
            <div>
              <p className="text-2xl font-semibold text-slate-100">{dashboard.profile.name}</p>
              <p className="mt-1 text-slate-300">{dashboard.profile.handle}</p>
              <p className="mt-1 text-sm text-slate-400">{dashboard.userEmail ?? "-"}</p>
              <p className="mt-1 text-xs font-semibold tracking-[0.08em] text-cyan-200">{t.userId}: {dashboard.profile.userId}</p>
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="tactical-subcard p-4 md:col-span-2 xl:col-span-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.levelProgress}</p>
              <p className="text-sm font-semibold text-cyan-200">
                Lv.{levelProgress.level}/{MAX_CREATOR_LEVEL}
              </p>
            </div>

            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-800/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-300 transition-all"
                style={{ width: `${levelProgress.progressPercent}%` }}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
              <span>{t.totalExp}: {levelProgress.totalExp.toLocaleString()}</span>
              {levelProgress.isMaxLevel
                ? <span>{t.levelMaxed}</span>
                : <span>{t.expToNext}: {levelProgress.expToNextLevel.toLocaleString()} / {levelProgress.expForNextLevel.toLocaleString()}</span>}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs text-slate-300">
              <span>
                {t.nextLevelReward}: {levelProgress.isMaxLevel ? t.levelMaxed : `+${nextLevelCoins.toLocaleString()} Coins`}
              </span>
            </div>
          </div>

          <div className="tactical-subcard p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.ageGroup}</p>
            <p className="mt-2 text-xl font-semibold text-slate-100">{dashboard.profile.ageGroup}</p>
          </div>
          <div className="tactical-subcard p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.followersRange}</p>
            <p className="mt-2 text-xl font-semibold text-slate-100">{dashboard.profile.followersRange}</p>
          </div>
          <div className="tactical-subcard p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.joinedAt}</p>
            <p className="mt-2 text-xl font-semibold text-slate-100">{dashboard.profile.joinedAt}</p>
          </div>
          <div className="tactical-subcard p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.pendingReviews}</p>
            <p className="mt-2 text-xl font-semibold text-slate-100">{dashboard.pendingCount}</p>
          </div>
        </div>
      </div>

      <div className="tactical-card mt-8 p-5 sm:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-100">{t.earningsTitle}</h2>
            <p className="mt-2 text-slate-300">{t.earningsDesc}</p>
          </div>
          <Link href="#support-center" className="tactical-btn-ghost px-5 py-3 text-sm">
            {locale === "en" ? "Need help?" : "需要協助？"}
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="tactical-subcard p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.totalEarned}</p>
            <p className="mt-2 text-3xl font-semibold text-amber-200">HK${dashboard.totalEarned.toLocaleString()}</p>
          </div>
          <div className="tactical-subcard p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.availableToWithdraw}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-100">HK${dashboard.availableToWithdraw.toLocaleString()}</p>
          </div>
          <div className="tactical-subcard p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.withdrawnSoFar}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-100">HK${dashboard.withdrawnSoFar.toLocaleString()}</p>
          </div>
        </div>

        <div className="tactical-subcard mt-4 px-4 py-3 text-sm text-slate-300">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t.recentWithdrawal}</p>
          <p className="mt-2">{t.noWithdrawal}</p>
        </div>
      </div>

      <div className="tactical-card mt-8 p-5 sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-slate-500">{dashboard.profile.platform} · {dashboard.profile.niche}</p>
            <p className="mt-2 text-xl font-semibold text-slate-100">{dashboard.profile.name} · {dashboard.profile.handle}</p>
          </div>
          <div className="tactical-subcard px-4 py-3 text-sm text-slate-300">
            {locale === "en" ? "Age" : "年齡"} {dashboard.profile.ageGroup} · {locale === "en" ? "Followers" : "追蹤數"} {dashboard.profile.followersRange} · {locale === "en" ? "Joined" : "加入時間"} {dashboard.profile.joinedAt}
          </div>
        </div>

        <div className="mt-6 flex flex-col items-start gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold text-slate-100">{t.activeMissions}</h2>
          <div className="tactical-subcard px-4 py-2 text-sm text-slate-300">
            {t.pendingReviews}: {dashboard.pendingCount}
          </div>
        </div>

        {activeMissions.length === 0 ? (
          <div className="tactical-subcard mt-6 px-4 py-4 text-slate-300">
            {locale === "en"
              ? "You don’t have any active missions yet. Accept a mission to start tracking it here."
              : "你目前尚無進行中任務。接受任務後，將於此處顯示。"}
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-4">
              {activeMissions.map((mission) => {
                const totalPrize = getMissionTotalPrizeByDifficulty(mission.difficulty);
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

                return <div key={mission.slug} className="tactical-subcard p-4 sm:p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm text-amber-200">{mission.brand}</p>
                        {submissionStatus ? (
                          <span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusColor}`}>
                            {submissionStatusLabel}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-2 text-lg font-semibold text-slate-100 sm:text-xl">{mission.title}</h3>
                      <p className="mt-2 text-sm text-slate-400">{t.due}：{mission.eta} · {t.reward}：HK${totalPrize.toLocaleString()}（60% / 30% / 10%）</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm font-semibold">
                      <Link href={`/missions/${mission.slug}`} className="tactical-link inline-flex min-h-11 items-center">
                        {t.viewBrief}
                      </Link>
                      <DashboardMissionActions missionSlug={mission.slug} eta={mission.eta} locale={locale} />
                    </div>
                  </div>
                </div>;
              })}
            </div>

            {nextReward ? (
              <div className="mt-8 rounded-xl border border-amber-300/50 bg-amber-300/10 p-5">
                <p className="text-sm text-amber-200">{t.nextReward}</p>
                <p className="mt-2 text-xl font-semibold text-slate-100">{nextReward.name}</p>
                <p className="mt-2 text-sm text-slate-300">{t.pointsAway} {pointsToNextReward} {t.pointsAwaySuffix}</p>
              </div>
            ) : null}
          </>
        )}
      </div>

      <ReferralRewardsCard
        locale={locale}
        referralCode={dashboard.referralStats.referralCode}
        invitedCount={dashboard.referralStats.invitedCount}
        paidBatches={dashboard.referralStats.paidBatches}
        totalRewardCoins={dashboard.referralStats.totalRewardCoins}
      />

      <div className="tactical-card mt-8 p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-slate-100">{t.referralHistory}</h2>
        {dashboard.referralHistory.length === 0 ? (
          <div className="tactical-subcard mt-4 px-4 py-4 text-sm text-slate-300">
            {t.referralEmpty}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {dashboard.referralHistory.map((item) => (
              <div key={item.id} className="tactical-subcard px-4 py-4 text-sm text-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-slate-100">INV-{item.invitedUserId.slice(0, 8).toUpperCase()}</p>
                  <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-xs font-semibold text-amber-200">
                    {t.referralStatus}: {referralStatusLabel(item.status)}
                  </span>
                </div>
                <p className="mt-2 text-slate-400">{item.createdAt}</p>
                <p className="mt-1 text-slate-300">{t.referralReward}: {item.rewardCoins.toLocaleString()} {locale === "en" ? "Coins" : "金幣"}</p>
                {item.rewardedAt ? <p className="mt-1 text-xs text-slate-400">{locale === "en" ? "Rewarded at" : "派獎時間"}: {item.rewardedAt}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>

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
