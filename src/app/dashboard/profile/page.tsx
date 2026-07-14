import Link from "next/link";
import { redirect } from "next/navigation";

import { UserProfileCard } from "@/components/user-profile-card";
import { getDashboardData, getRewardsPageData } from "@/lib/backend";
import { getGamePassLevelRewardCoins } from "@/lib/game-pass";
import { getCurrentLocale } from "@/lib/i18n";
import { getLevelProgressFromTotalExp, MAX_CREATOR_LEVEL } from "@/lib/mission-rules";

export default async function DashboardProfilePage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const startEditing = ["1", "true", "yes"].includes((resolvedSearchParams.edit ?? "").toLowerCase());
  const locale = await getCurrentLocale();
  const [dashboard, rewardsPageData] = await Promise.all([getDashboardData(), getRewardsPageData()]);

  if (dashboard.mode === "unauthenticated") {
    redirect("/login?next=/dashboard/profile");
  }

  if (dashboard.mode !== "live") {
    redirect("/dashboard");
  }

  const t = locale === "en"
    ? {
      title: "Profile Details",
      back: "Back",
      userId: "User ID",
      level: "Level",
      totalExp: "Total EXP",
      expToNext: "EXP to next",
      nextReward: "Next level reward",
      levelMaxed: "Max level reached",
      ageGroup: "Age group",
      followersRange: "Follower band",
      joinedAt: "Joined",
      pendingReviews: "Pending reviews",
      recentOrders: "Recent Orders",
      noOrders: "No orders yet. Complete missions and redeem your first reward.",
      coins: "Coins",
    }
    : {
      title: "個人資料",
      back: "返回",
      userId: "用戶編號",
      level: "等級",
      totalExp: "總 EXP",
      expToNext: "升級尚欠 EXP",
      nextReward: "下一級獎勵",
      levelMaxed: "已達最高等級",
      ageGroup: "年齡組別",
      followersRange: "追蹤數區間",
      joinedAt: "加入時間",
      pendingReviews: "待審核提交",
      recentOrders: "最近訂單",
      noOrders: "目前尚無兌換紀錄。完成任務後即可兌換第一件獎賞。",
      coins: "金幣",
    };

  const statusLabel = (status: string) => {
    if (locale === "en") return status;
    if (status === "Pending") return "待處理";
    if (status === "Fulfilled") return "已完成";
    if (status === "Rejected") return "已拒絕";
    return status;
  };

  const statusPillClass = (status: string) => {
    if (status === "Fulfilled") {
      return "border-emerald-300/40 bg-emerald-300/12 text-emerald-200";
    }
    if (status === "Rejected") {
      return "border-rose-300/40 bg-rose-300/12 text-rose-200";
    }
    return "border-amber-300/40 bg-amber-300/12 text-amber-200";
  };

  const approvedExp = dashboard.submissions
    .filter((item) => item.status === "Approved")
    .reduce((sum, item) => sum + Math.max(item.coins ?? 0, 0), 0);
  const levelProgress = getLevelProgressFromTotalExp(approvedExp);
  const nextLevelCoins = levelProgress.isMaxLevel ? 0 : getGamePassLevelRewardCoins(levelProgress.level + 1);
  return (
    <section className="section-shell py-12 sm:py-16">
      <Link href="/dashboard" className="text-sm font-semibold text-cyan-300">← {t.back}</Link>

      <div className="mt-6">
        <UserProfileCard
          locale={locale}
          initialName={dashboard.profile.name}
          initialHandle={dashboard.profile.handle}
          initialFollowersRange={dashboard.profile.followersRange}
          email={dashboard.userEmail}
          startEditing={startEditing}
        />
      </div>

      <div className="tactical-card mt-6 p-6 sm:p-8">
        <div id="level-progress" className="border-t border-white/10 pt-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-400">{t.level}</p>
            <p className="text-lg font-semibold text-cyan-200">Lv.{levelProgress.level}/{MAX_CREATOR_LEVEL}</p>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-800/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-300 transition-all"
              style={{ width: `${levelProgress.progressPercent}%` }}
            />
          </div>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <p>{t.totalExp}: {levelProgress.totalExp.toLocaleString()}</p>
            <p>
              {levelProgress.isMaxLevel
                ? t.levelMaxed
                : `${t.expToNext}: ${levelProgress.expToNextLevel.toLocaleString()} / ${levelProgress.expForNextLevel.toLocaleString()}`}
            </p>
            <p>{t.nextReward}: {levelProgress.isMaxLevel ? t.levelMaxed : `+${nextLevelCoins.toLocaleString()} Coins`}</p>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-5">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-slate-400">{t.ageGroup}</p>
              <p className="font-semibold text-slate-100">{dashboard.profile.ageGroup}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-slate-400">{t.followersRange}</p>
              <p className="font-semibold text-slate-100">{dashboard.profile.followersRange}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-slate-400">{t.joinedAt}</p>
              <p className="font-semibold text-slate-100">{dashboard.profile.joinedAt}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-slate-400">{t.pendingReviews}</p>
              <p className="font-semibold text-slate-100">{dashboard.pendingCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div id="recent-orders" className="tactical-card mt-6 p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-slate-100">{t.recentOrders}</h2>
        <div className="mt-4 max-h-80 space-y-2.5 overflow-y-auto pr-1">
          {rewardsPageData.redemptions.length > 0 ? (
            rewardsPageData.redemptions.map((redemption) => (
              <div key={redemption.id} className="tactical-subcard px-4 py-3 text-sm text-slate-300">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-100">{redemption.rewardName}</p>
                    <p className="mt-1 text-xs text-slate-400">{redemption.createdAt}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusPillClass(redemption.status)}`}>
                    {statusLabel(redemption.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-amber-200">{redemption.costCoins.toLocaleString()} {t.coins}</p>
                {redemption.notes ? <p className="mt-1 text-slate-400">{redemption.notes}</p> : null}
              </div>
            ))
          ) : (
            <div className="tactical-subcard px-4 py-4 text-sm text-slate-300">
              {t.noOrders}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
