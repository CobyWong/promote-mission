"use client";

import { useMemo, useState } from "react";
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

function createIdempotencyKey(namespace: string, rewardSlug: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${namespace}:${rewardSlug}:${crypto.randomUUID()}`;
  }

  return `${namespace}:${rewardSlug}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

function parseRetryAfterMs(response: Response) {
  const retryAfter = Number.parseInt(response.headers.get("retry-after") ?? "", 10);
  if (Number.isNaN(retryAfter) || retryAfter <= 0) {
    return null;
  }

  return retryAfter * 1000;
}

function waitFor(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function RewardShopClient({ rewards, balance, isAuthenticated, userLevel, locale = "zh-HK" }: RewardShopClientProps) {
  const router = useRouter();
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  const t = locale === "en"
    ? {
      walletTitle: "Wallet",
      availableCoins: "Available Coins",
      currentLevel: "Current level",
      loginToRedeem: "Log in to redeem",
      etaFallback: "1-3 business days",
      coins: "Coins",
      unlockLevel: "Unlock level",
      soldOut: "Sold out",
      insufficient: "Insufficient Coins",
      lockedLevel: "Level locked",
      redeemNow: "Redeem now",
      redeeming: "Redeeming...",
      unavailable: "Unavailable",
      emptyTitle: "No matching rewards",
      emptyDesc: "Try another search keyword or filter.",
      close: "Close",
      detailTitle: "Reward details",
      priceLabel: "Price",
      etaLabel: "Delivery ETA",
    }
    : {
      walletTitle: "我的錢包",
      availableCoins: "可用金幣",
      currentLevel: "目前等級",
      loginToRedeem: "登入後兌換",
      etaFallback: "1-3 個工作天",
      coins: "金幣",
      unlockLevel: "解鎖等級",
      soldOut: "已售罄",
      insufficient: "金幣不足",
      lockedLevel: "等級未達",
      redeemNow: "立即兌換",
      redeeming: "兌換中...",
      unavailable: "暫時不可兌換",
      emptyTitle: "沒有符合條件的商品",
      emptyDesc: "請嘗試其他搜尋關鍵字或篩選條件。",
      close: "關閉",
      detailTitle: "獎賞詳情",
      priceLabel: "售價",
      etaLabel: "預計到帳",
    };

  const filteredRewards = useMemo(() => {
    const list = [...rewards].sort((a, b) => {
      const aFeatured = a.badge ? 1 : 0;
      const bFeatured = b.badge ? 1 : 0;
      if (bFeatured !== aFeatured) {
        return bFeatured - aFeatured;
      }
      return a.cost - b.cost;
    });

    return list;
  }, [rewards]);

  async function handleRedeem(reward: Reward) {
    if (!isAuthenticated) {
      router.push("/login?next=/rewards");
      return false;
    }

    setPendingSlug(reward.slug);
    setError(null);
    setSuccess(null);

    const idempotencyKey = createIdempotencyKey("web-redemption", reward.slug);
    const maxRetries = 1;

    let response: Response | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      response = await fetch("/api/redemptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({ rewardSlug: reward.slug }),
      });

      if (response.status === 429 && attempt < maxRetries) {
        const retryAfterMs = parseRetryAfterMs(response) ?? 1200;
        await waitFor(Math.min(3000, retryAfterMs));
        continue;
      }

      break;
    }

    if (!response) {
      setError(locale === "en" ? "Redemption request could not be sent." : "未能送出兌換請求。請稍後再試。");
      setPendingSlug(null);
      return false;
    }

    const result = (await response.json()) as { error?: string; redemptionId?: string };

    if (!response.ok) {
      if (response.status === 409) {
        setError(locale === "en"
          ? "A similar redemption is being processed. Wait a few seconds and refresh before trying again."
          : "相同兌換正在處理中，請稍等幾秒後重新整理再試。");
      } else if (response.status === 429) {
        setError(locale === "en"
          ? "Too many redemption attempts. Please wait a moment, then retry once."
          : "兌換嘗試過於頻繁，請稍等片刻後再重試一次。");
      } else {
        setError(result.error ?? (locale === "en" ? "Redemption failed. Please try again." : "兌換失敗，請稍後再試。"));
      }
      setPendingSlug(null);
      return false;
    }

    setSuccess(locale === "en" ? `Redemption submitted (${result.redemptionId ?? reward.slug})` : `已提交兌換申請 (${result.redemptionId ?? reward.slug})`);
    setPendingSlug(null);
    router.refresh();
    return true;
  }

  return (
    <div className="space-y-7">
      <div className="tactical-card p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/90">{t.walletTitle}</p>
        <p className="mt-2 text-sm text-slate-400">{t.availableCoins}</p>
        <p className="mt-2 text-3xl font-semibold text-amber-200 sm:text-4xl">{balance.toLocaleString()}</p>
        <p className="mt-2 text-sm font-semibold text-cyan-200">
          {t.currentLevel}: Lv.{userLevel}
        </p>
        {!isAuthenticated ? (
          <p className="mt-3 text-sm text-slate-300">
            {locale === "en" ? "Log in to use live redemption." : "登入後方可使用正式兌換流程。"}
          </p>
        ) : null}
        {!isAuthenticated ? (
          <Link href="/login?next=/rewards" className="tactical-btn-primary mt-5 px-5 py-3">
            {t.loginToRedeem}
          </Link>
        ) : null}
      </div>

      {error ? <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-4 text-sm text-rose-100">{error}</div> : null}
      {success ? <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-4 text-sm text-emerald-100">{success}</div> : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {filteredRewards.map((reward) => {
          const rewardInitial = reward.name.trim().charAt(0).toUpperCase() || "R";
          const etaLabel = reward.eta ?? t.etaFallback;

          return (
            <button
              key={reward.slug}
              type="button"
              onClick={() => setSelectedReward(reward)}
              className="overflow-hidden rounded-3xl border border-slate-500/70 bg-slate-900/45 text-left shadow-[0_18px_34px_rgba(9,14,22,0.24)] transition hover:-translate-y-1 hover:border-cyan-300/45"
            >
              <div className="relative overflow-hidden px-3 pb-3 pt-3 sm:px-5 sm:pb-4 sm:pt-5">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-300/16 via-transparent to-slate-900/10" />
                <div className="relative flex flex-col gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/35 bg-cyan-300/10 text-base font-bold text-cyan-100 sm:h-12 sm:w-12 sm:text-lg">
                      {rewardInitial}
                    </div>
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 break-words text-lg font-bold leading-tight text-slate-100 sm:text-xl">{reward.name}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-300 sm:text-sm">{reward.description}</p>
                    </div>
                  </div>
                </div>

              </div>

              <div className="border-t border-slate-600/60 bg-slate-900/35 px-3 py-3 sm:px-5 sm:py-4">
                <div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">{t.priceLabel}</p>
                    <p className="mt-1 text-2xl font-black leading-none text-amber-200 sm:text-4xl">{reward.cost.toLocaleString()}</p>
                    <p className="mt-1 text-xs text-slate-400">{t.coins}</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{t.etaLabel}: {etaLabel}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedReward ? (() => {
        const minLevel = selectedReward.minLevel ?? 1;
        const hasStock = selectedReward.stock === null || selectedReward.stock === undefined || selectedReward.stock > 0;
        const hasEnoughCoins = balance >= selectedReward.cost;
        const hasRequiredLevel = userLevel >= minLevel;
        const canRedeem = hasEnoughCoins && hasStock && hasRequiredLevel;
        const etaLabel = selectedReward.eta ?? t.etaFallback;
        const actionLabel = pendingSlug === selectedReward.slug
          ? t.redeeming
          : canRedeem
            ? t.redeemNow
            : isAuthenticated
              ? !hasRequiredLevel
                ? locale === "en" ? `Locked until Lv.${minLevel}` : `Lv.${minLevel} 起可兌換`
                : !hasStock
                ? t.soldOut
                : !hasEnoughCoins
                  ? t.insufficient
                  : t.unavailable
              : t.loginToRedeem;

        return (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 p-4 sm:items-center" role="dialog" aria-modal="true">
            <div className="w-full max-w-lg rounded-3xl border border-slate-500/70 bg-slate-900/95 p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/90">{t.detailTitle}</p>
                  <h3 className="mt-1 text-2xl font-semibold text-slate-100">{selectedReward.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReward(null)}
                  className="rounded-full border border-white/20 px-3 py-1 text-sm text-slate-200"
                >
                  {t.close}
                </button>
              </div>

              <p className="mt-3 text-sm text-slate-300">{selectedReward.description}</p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">{t.priceLabel}</p>
                  <p className="mt-1 text-xl font-black text-amber-200">{selectedReward.cost.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">{t.coins}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400">{t.unlockLevel}</p>
                  <p className="mt-1 text-xl font-black text-cyan-100">Lv.{minLevel}</p>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-400">{t.etaLabel}: {etaLabel}</p>

              <button
                type="button"
                disabled={!canRedeem || pendingSlug === selectedReward.slug}
                onClick={async () => {
                  const ok = await handleRedeem(selectedReward);
                  if (ok) {
                    setSelectedReward(null);
                  }
                }}
                className="tactical-btn-primary mt-5 h-11 w-full rounded-2xl px-4 text-sm sm:h-12 sm:text-base disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-700 disabled:text-slate-400"
              >
                {actionLabel}
              </button>
            </div>
          </div>
        );
      })() : null}

      {filteredRewards.length === 0 ? (
        <div className="tactical-card p-10 text-center">
          <p className="text-2xl font-semibold text-slate-100">{t.emptyTitle}</p>
          <p className="mt-2 text-sm text-slate-300">{t.emptyDesc}</p>
        </div>
      ) : null}
    </div>
  );
}
