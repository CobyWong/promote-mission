import Link from "next/link";
import { redirect } from "next/navigation";

import { ReferralRewardsCard } from "@/components/referral-rewards-card";
import { getDashboardData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

export default async function DashboardReferralsPage() {
  const locale = await getCurrentLocale();
  const dashboard = await getDashboardData();

  if (dashboard.mode === "unauthenticated") {
    redirect("/login?next=/dashboard/referrals");
  }

  if (dashboard.mode !== "live") {
    redirect("/dashboard");
  }

  const t = locale === "en"
    ? {
      back: "Back",
      title: "Referral Center",
      history: "Referral reward history",
      empty: "No referral records yet.",
      status: "Status",
      reward: "Reward",
      statusInvited: "Invited",
      statusQualified: "Qualified",
      statusRewarded: "Rewarded",
      rewardedAt: "Rewarded at",
    }
    : {
      back: "返回",
      title: "推薦中心",
      history: "推薦獎勵紀錄",
      empty: "暫時未有推薦紀錄。",
      status: "狀態",
      reward: "獎勵",
      statusInvited: "已邀請",
      statusQualified: "已達資格",
      statusRewarded: "已派獎",
      rewardedAt: "派獎時間",
    };

  const referralStatusLabel = (status: string) => {
    if (status === "Rewarded") return t.statusRewarded;
    if (status === "Qualified") return t.statusQualified;
    return t.statusInvited;
  };

  return (
    <section className="section-shell py-12 sm:py-16">
      <Link href="/dashboard" className="text-sm font-semibold text-cyan-300">← {t.back}</Link>

      <h1 className="mt-6 text-3xl font-semibold text-slate-100">{t.title}</h1>

      <ReferralRewardsCard
        locale={locale}
        referralCode={dashboard.referralStats.referralCode}
        invitedCount={dashboard.referralStats.invitedCount}
        totalRewardCoins={dashboard.referralStats.totalRewardCoins}
      />

      <div className="tactical-card mt-8 p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-slate-100">{t.history}</h2>
        {dashboard.referralHistory.length === 0 ? (
          <p className="mt-4 text-sm text-slate-300">{t.empty}</p>
        ) : (
          <div className="mt-4 space-y-4">
            {dashboard.referralHistory.map((item) => (
              <div key={item.id} className="border-t border-white/10 pt-4 first:border-t-0 first:pt-0 text-sm text-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-slate-100">INV-{item.invitedUserId.slice(0, 8).toUpperCase()}</p>
                  <span className="text-amber-200">{t.status}: {referralStatusLabel(item.status)}</span>
                </div>
                <p className="mt-2 text-slate-400">{item.createdAt}</p>
                <p className="mt-1">{t.reward}: {item.rewardCoins.toLocaleString()} {locale === "en" ? "Coins" : "金幣"}</p>
                {item.rewardedAt ? <p className="mt-1 text-xs text-slate-400">{t.rewardedAt}: {item.rewardedAt}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
