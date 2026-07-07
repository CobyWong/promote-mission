"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Reward, RewardRedemption } from "@/lib/data";
import type { Locale } from "@/lib/i18n";

type RewardShopClientProps = {
  rewards: Reward[];
  balance: number;
  redemptions: RewardRedemption[];
  isAuthenticated: boolean;
  userLevel: number;
  locale?: Locale;
};

export function RewardShopClient({ rewards, balance, redemptions, isAuthenticated, userLevel, locale = "zh-HK" }: RewardShopClientProps) {
  const router = useRouter();
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const statusLabel = (status: string) => {
    if (locale === "en") return status;
    if (status === "Pending") return "待處理";
    if (status === "Fulfilled") return "已完成";
    if (status === "Rejected") return "已拒絕";
    return status;
  };

  async function handleRedeem(reward: Reward) {
    if (!isAuthenticated) {
      router.push("/login?next=/rewards");
      return;
    }

    setPendingSlug(reward.slug);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/redemptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rewardSlug: reward.slug }),
    });

    const result = (await response.json()) as { error?: string; redemptionId?: string };

    if (!response.ok) {
      setError(result.error ?? (locale === "en" ? "Redemption failed. Please try again." : "兌換失敗，請稍後再試。"));
      setPendingSlug(null);
      return;
    }

    setSuccess(locale === "en" ? `Redemption submitted (${result.redemptionId ?? reward.slug})` : `已提交兌換申請 (${result.redemptionId ?? reward.slug})`);
    setPendingSlug(null);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="tactical-card p-6">
          <p className="text-sm text-slate-400">{locale === "en" ? "Available Coins" : "可用金幣"}</p>
          <p className="mt-2 text-4xl font-semibold text-amber-200">{balance.toLocaleString()}</p>
          <p className="mt-2 text-sm font-semibold text-cyan-200">
            {locale === "en" ? `Current level: Lv.${userLevel}` : `目前等級：Lv.${userLevel}`}
          </p>
          <p className="mt-3 text-sm text-slate-300">
            {isAuthenticated
              ? locale === "en" ? "Pick your reward and redeem instantly." : "揀中心儀獎賞即刻兌換。"
              : locale === "en" ? "Log in to use live redemption." : "登入後先可以使用真實兌換流程。"}
          </p>
          {!isAuthenticated ? (
            <Link href="/login?next=/rewards" className="tactical-btn-primary mt-5 px-5 py-3">
              {locale === "en" ? "Log in to redeem" : "登入後兌換"}
            </Link>
          ) : null}
        </div>

        <div className="tactical-card p-6">
          <h2 className="text-xl font-semibold text-slate-100">{locale === "en" ? "Recent Redemptions" : "最近兌換紀錄"}</h2>
          <div className="mt-4 space-y-3">
            {redemptions.length > 0 ? (
              redemptions.map((redemption) => (
                <div key={redemption.id} className="tactical-subcard px-4 py-4 text-sm text-slate-300">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-100">{redemption.rewardName}</span>
                    <span>{statusLabel(redemption.status)}</span>
                  </div>
                  <p className="mt-2">{redemption.createdAt} · {redemption.costCoins.toLocaleString()} {locale === "en" ? "Coins" : "金幣"}</p>
                  {redemption.notes ? <p className="mt-1 text-slate-400">{redemption.notes}</p> : null}
                </div>
              ))
            ) : (
              <div className="tactical-subcard px-4 py-4 text-sm text-slate-300">
                {locale === "en" ? "No redemption history yet." : "未有兌換紀錄。完成任務後可以返嚟兌換。"}
              </div>
            )}
          </div>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-4 text-sm text-rose-100">{error}</div> : null}
      {success ? <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-4 text-sm text-emerald-100">{success}</div> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {rewards.map((reward) => {
          const minLevel = reward.minLevel ?? 1;
          const hasStock = reward.stock === null || reward.stock === undefined || reward.stock > 0;
          const hasEnoughCoins = balance >= reward.cost;
          const hasRequiredLevel = userLevel >= minLevel;
          const canRedeem = hasEnoughCoins && hasStock && hasRequiredLevel;

          return (
            <article key={reward.slug} className="tactical-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">{reward.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{reward.description}</p>
                </div>
                {reward.badge ? (
                  <span className="tactical-chip">
                    {reward.badge}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 inline-flex rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                {locale === "en" ? `Unlock level: Lv.${minLevel}` : `解鎖等級：Lv.${minLevel}`}
              </div>

              <div className="mt-6 flex items-center justify-between text-sm">
                <span className="text-slate-400">{reward.eta ?? (locale === "en" ? "1-3 business days" : "1-3 個工作天")} · {locale === "en" ? "Stock" : "庫存"} {reward.stock ?? "∞"}</span>
                <span className="font-semibold text-amber-200">{reward.cost.toLocaleString()} {locale === "en" ? "Coins" : "金幣"}</span>
              </div>
              <button
                type="button"
                disabled={!canRedeem || pendingSlug === reward.slug}
                onClick={() => handleRedeem(reward)}
                className="tactical-btn-primary mt-6 w-full px-5 py-3 disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-700 disabled:text-slate-400"
              >
                {pendingSlug === reward.slug
                  ? locale === "en" ? "Redeeming..." : "兌換中..."
                  : canRedeem
                    ? locale === "en" ? "Redeem now" : "立即兌換"
                    : isAuthenticated
                      ? !hasRequiredLevel
                        ? locale === "en" ? `Locked until Lv.${minLevel}` : `Lv.${minLevel} 先可兌換`
                        : !hasStock
                        ? locale === "en" ? "Sold out" : "已售罄"
                        : !hasEnoughCoins
                          ? locale === "en" ? "Insufficient Coins" : "金幣不足"
                          : locale === "en" ? "Unavailable" : "暫時不可兌換"
                      : locale === "en" ? "Log in to redeem" : "登入後兌換"}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
