import Link from "next/link";
import { redirect } from "next/navigation";

import { getDashboardData } from "@/lib/backend";
import { getGamePassLevelRewardCoins } from "@/lib/game-pass";
import { getCurrentLocale } from "@/lib/i18n";
import { getLevelProgressFromTotalExp, MAX_CREATOR_LEVEL } from "@/lib/mission-rules";

export default async function DashboardProfilePage() {
  const locale = await getCurrentLocale();
  const dashboard = await getDashboardData();

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
    };

  const approvedExp = dashboard.submissions
    .filter((item) => item.status === "Approved")
    .reduce((sum, item) => sum + Math.max(item.coins ?? 0, 0), 0);
  const levelProgress = getLevelProgressFromTotalExp(approvedExp);
  const nextLevelCoins = levelProgress.isMaxLevel ? 0 : getGamePassLevelRewardCoins(levelProgress.level + 1);
  const avatarInitial = dashboard.profile.name?.trim().slice(0, 1).toUpperCase() ?? "C";

  return (
    <section className="section-shell py-12 sm:py-16">
      <Link href="/dashboard" className="text-sm font-semibold text-cyan-300">← {t.back}</Link>

      <div className="tactical-card mt-6 p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-300/40 bg-amber-300/10 text-3xl font-semibold text-amber-200">
            {avatarInitial}
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">{dashboard.profile.name}</h1>
            <p className="mt-1 text-slate-300">{dashboard.profile.handle}</p>
            <p className="mt-1 text-xs font-semibold tracking-[0.08em] text-cyan-200">{t.userId}: {dashboard.profile.userId}</p>
          </div>
        </div>

        <div id="level-progress" className="mt-8 border-t border-white/10 pt-5">
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
    </section>
  );
}
