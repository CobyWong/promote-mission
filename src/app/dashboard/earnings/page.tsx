import Link from "next/link";
import { redirect } from "next/navigation";

import { getDashboardData, getRewardsCatalog } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

export default async function DashboardEarningsPage() {
  const locale = await getCurrentLocale();
  const [dashboard, rewardsCatalog] = await Promise.all([getDashboardData(), getRewardsCatalog()]);

  if (dashboard.mode === "unauthenticated") {
    redirect("/login?next=/dashboard/earnings");
  }

  if (dashboard.mode !== "live") {
    redirect("/dashboard");
  }

  const t = locale === "en"
    ? {
      title: "Earnings & Wallet",
      back: "Back",
      totalEarned: "Total earned",
      availableToWithdraw: "Available to withdraw",
      withdrawnSoFar: "Withdrawn so far",
      recentWithdrawal: "Recent withdrawal",
      noWithdrawal: "No withdrawals yet.",
      nextReward: "Next redeemable reward",
      pointsAway: "Coins needed",
      goRewards: "Go to rewards",
    }
    : {
      title: "收益與錢包",
      back: "返回",
      totalEarned: "累計收益",
      availableToWithdraw: "可提現",
      withdrawnSoFar: "已提現",
      recentWithdrawal: "最近提現",
      noWithdrawal: "未有提現紀錄。",
      nextReward: "下一個可兌換獎賞",
      pointsAway: "尚欠金幣",
      goRewards: "前往獎賞商城",
    };

  const nextReward = rewardsCatalog.rewards.find((reward) => reward.cost > dashboard.balance)
    ?? rewardsCatalog.rewards[rewardsCatalog.rewards.length - 1]
    ?? null;
  const pointsToNextReward = nextReward ? Math.max(nextReward.cost - dashboard.balance, 0) : 0;

  return (
    <section className="section-shell py-12 sm:py-16">
      <Link href="/dashboard" className="text-sm font-semibold text-cyan-300">← {t.back}</Link>

      <div className="tactical-card mt-6 p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-slate-100">{t.title}</h1>

        <div className="mt-6 space-y-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-slate-400">{t.totalEarned}</p>
            <p className="text-xl font-semibold text-amber-200">HK${dashboard.totalEarned.toLocaleString()}</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-slate-400">{t.availableToWithdraw}</p>
            <p className="text-xl font-semibold text-slate-100">HK${dashboard.availableToWithdraw.toLocaleString()}</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-slate-400">{t.withdrawnSoFar}</p>
            <p className="text-xl font-semibold text-slate-100">HK${dashboard.withdrawnSoFar.toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-4 text-sm text-slate-300">
          <p className="text-slate-400">{t.recentWithdrawal}</p>
          <p className="mt-2">{t.noWithdrawal}</p>
        </div>

        {nextReward ? (
          <div className="mt-8 border-t border-white/10 pt-4 text-sm text-slate-300">
            <p className="text-amber-200">{t.nextReward}</p>
            <p className="mt-2 text-lg font-semibold text-slate-100">{nextReward.name}</p>
            <p className="mt-1">{t.pointsAway}: {pointsToNextReward.toLocaleString()}</p>
          </div>
        ) : null}

        <Link href="/rewards" className="tactical-btn-primary mt-8 px-5 py-3">
          {t.goRewards}
        </Link>
      </div>
    </section>
  );
}
