import Link from "next/link";
import { redirect } from "next/navigation";

import { getRewardsPageData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

export default async function DashboardRedemptionsPage() {
  const locale = await getCurrentLocale();
  const rewardsPageData = await getRewardsPageData();

  if (!rewardsPageData.isAuthenticated) {
    redirect("/login?next=/dashboard/redemptions");
  }

  if (rewardsPageData.mode !== "live") {
    redirect("/dashboard");
  }

  const t = locale === "en"
    ? {
      title: "Wallet and Redemption",
      subtitle: "Track your reward redemption history and current request status.",
      back: "Back",
      balance: "Available Coins",
      records: "Redemption Records",
      noOrders: "No orders yet. Complete missions and redeem your first reward.",
      coins: "Coins",
      goRewards: "Go to rewards",
    }
    : {
      title: "錢包與兌換",
      subtitle: "查看獎賞兌換紀錄與目前處理狀態。",
      back: "返回",
      balance: "可用金幣",
      records: "兌換紀錄",
      noOrders: "目前尚無兌換紀錄。完成任務後即可兌換第一件獎賞。",
      coins: "金幣",
      goRewards: "前往獎賞商城",
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

  return (
    <section className="section-shell py-12 sm:py-16">
      <Link href="/dashboard" className="text-sm font-semibold text-cyan-300">&larr; {t.back}</Link>

      <div className="tactical-card mt-6 p-6 sm:p-8">
        <h1 className="text-3xl font-semibold text-slate-100">{t.title}</h1>
        <p className="mt-2 text-sm text-slate-300">{t.subtitle}</p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{t.balance}</p>
          <p className="mt-2 text-3xl font-semibold text-amber-200">{rewardsPageData.balance.toLocaleString()}</p>
          <p className="mt-1 text-sm text-slate-400">{t.coins}</p>
        </div>

        <div className="mt-6 border-t border-white/10 pt-5">
          <h2 className="text-xl font-semibold text-slate-100">{t.records}</h2>
          <div className="mt-4 max-h-96 space-y-2.5 overflow-y-auto pr-1">
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

        <Link href="/rewards" className="tactical-btn-primary mt-6 px-5 py-3">
          {t.goRewards}
        </Link>
      </div>
    </section>
  );
}