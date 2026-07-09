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

type RewardSortKey = "recommended" | "priceAsc" | "priceDesc" | "levelAsc";
type RewardFilterKey = "all" | "affordable" | "unlockable";

function getRewardVisualMeta(reward: Reward, locale: Locale) {
  const name = `${reward.name} ${reward.slug}`.toLowerCase();

  if (name.includes("usdt")) {
    return {
      icon: "₮",
      overline: locale === "en" ? "Digital payout" : "數位獎賞",
      gradient: "from-emerald-300/25 via-cyan-300/10 to-transparent",
    };
  }

  if (name.includes("voucher") || name.includes("禮券") || name.includes("hks100")) {
    return {
      icon: "券",
      overline: locale === "en" ? "Instant voucher" : "即時禮券",
      gradient: "from-amber-300/20 via-lime-300/10 to-transparent",
    };
  }

  if (name.includes("airpods") || name.includes("sony") || name.includes("headphone")) {
    return {
      icon: "♪",
      overline: locale === "en" ? "Creator gear" : "創作裝備",
      gradient: "from-violet-300/22 via-cyan-300/10 to-transparent",
    };
  }

  return {
    icon: reward.name.trim().charAt(0).toUpperCase() || "R",
    overline: locale === "en" ? "Featured reward" : "精選獎賞",
    gradient: "from-cyan-300/16 via-slate-900/5 to-transparent",
  };
}

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

export function RewardShopClient({ rewards, balance, redemptions, isAuthenticated, userLevel, locale = "zh-HK" }: RewardShopClientProps) {
  const router = useRouter();
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<RewardSortKey>("recommended");
  const [filterBy, setFilterBy] = useState<RewardFilterKey>("all");

  const t = locale === "en"
    ? {
      walletTitle: "Wallet",
      availableCoins: "Available Coins",
      currentLevel: "Current level",
      shopHint: "Browse rewards like an online store and redeem instantly.",
      loginToRedeem: "Log in to redeem",
      recentOrders: "Recent Orders",
      noOrders: "No orders yet. Complete missions and redeem your first reward.",
      searchPlaceholder: "Search rewards (e.g. voucher, USDT, AirPods)",
      sortLabel: "Sort",
      sortRecommended: "Recommended",
      sortPriceAsc: "Price: low to high",
      sortPriceDesc: "Price: high to low",
      sortLevelAsc: "Unlock level",
      filterAll: "All",
      filterAffordable: "Can afford",
      filterUnlockable: "Level unlocked",
      etaFallback: "1-3 business days",
      stock: "Stock",
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
      estDelivery: "Est. delivery",
      secureRedemption: "Secure redemption",
    }
    : {
      walletTitle: "我的錢包",
      availableCoins: "可用金幣",
      currentLevel: "目前等級",
      shopHint: "以網店方式瀏覽獎賞，選好即時兌換。",
      loginToRedeem: "登入後兌換",
      recentOrders: "最近訂單",
      noOrders: "目前尚無兌換紀錄。完成任務後即可兌換第一件獎賞。",
      searchPlaceholder: "搜尋獎賞（例如：禮券、USDT、AirPods）",
      sortLabel: "排序",
      sortRecommended: "推薦",
      sortPriceAsc: "價格：低至高",
      sortPriceDesc: "價格：高至低",
      sortLevelAsc: "解鎖等級",
      filterAll: "全部",
      filterAffordable: "可負擔",
      filterUnlockable: "等級已解鎖",
      etaFallback: "1-3 個工作天",
      stock: "庫存",
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
      estDelivery: "預計送達",
      secureRedemption: "安全兌換",
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

  const filteredRewards = useMemo(() => {
    let list = rewards.filter((reward) => {
      const keyword = query.trim().toLowerCase();
      const matchesQuery = keyword.length === 0
        || reward.name.toLowerCase().includes(keyword)
        || reward.description.toLowerCase().includes(keyword)
        || reward.slug.toLowerCase().includes(keyword)
        || (reward.badge ?? "").toLowerCase().includes(keyword);

      if (!matchesQuery) {
        return false;
      }

      const minLevel = reward.minLevel ?? 1;
      if (filterBy === "affordable" && balance < reward.cost) {
        return false;
      }
      if (filterBy === "unlockable" && userLevel < minLevel) {
        return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "priceAsc") return a.cost - b.cost;
      if (sortBy === "priceDesc") return b.cost - a.cost;
      if (sortBy === "levelAsc") return (a.minLevel ?? 1) - (b.minLevel ?? 1);

      const aFeatured = a.badge ? 1 : 0;
      const bFeatured = b.badge ? 1 : 0;
      if (bFeatured !== aFeatured) {
        return bFeatured - aFeatured;
      }
      return a.cost - b.cost;
    });

    return list;
  }, [balance, filterBy, query, rewards, sortBy, userLevel]);

  async function handleRedeem(reward: Reward) {
    if (!isAuthenticated) {
      router.push("/login?next=/rewards");
      return;
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
      return;
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
      return;
    }

    setSuccess(locale === "en" ? `Redemption submitted (${result.redemptionId ?? reward.slug})` : `已提交兌換申請 (${result.redemptionId ?? reward.slug})`);
    setPendingSlug(null);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="tactical-card p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/90">{t.walletTitle}</p>
          <p className="mt-2 text-sm text-slate-400">{t.availableCoins}</p>
          <p className="mt-2 text-4xl font-semibold text-amber-200">{balance.toLocaleString()}</p>
          <p className="mt-2 text-sm font-semibold text-cyan-200">
            {t.currentLevel}: Lv.{userLevel}
          </p>
          <p className="mt-3 text-sm text-slate-300">
            {isAuthenticated
              ? t.shopHint
              : locale === "en" ? "Log in to use live redemption." : "登入後方可使用正式兌換流程。"}
          </p>
          {!isAuthenticated ? (
            <Link href="/login?next=/rewards" className="tactical-btn-primary mt-5 px-5 py-3">
              {t.loginToRedeem}
            </Link>
          ) : null}
        </div>

        <div className="tactical-card p-6">
          <h2 className="text-xl font-semibold text-slate-100">{t.recentOrders}</h2>
          <div className="mt-4 max-h-80 space-y-2.5 overflow-y-auto pr-1">
            {redemptions.length > 0 ? (
              redemptions.map((redemption) => (
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
      </div>

      {error ? <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-4 text-sm text-rose-100">{error}</div> : null}
      {success ? <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-4 text-sm text-emerald-100">{success}</div> : null}

      <div className="tactical-card p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.searchPlaceholder}
            className="h-11 rounded-xl border border-slate-500/70 bg-slate-900/55 px-4 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60"
          />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <span>{t.sortLabel}</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as RewardSortKey)}
              className="h-11 rounded-xl border border-slate-500/70 bg-slate-900/55 px-3 text-sm text-slate-100"
            >
              <option value="recommended">{t.sortRecommended}</option>
              <option value="priceAsc">{t.sortPriceAsc}</option>
              <option value="priceDesc">{t.sortPriceDesc}</option>
              <option value="levelAsc">{t.sortLevelAsc}</option>
            </select>
          </label>
          <div className="flex items-center gap-2">
            {([
              ["all", t.filterAll],
              ["affordable", t.filterAffordable],
              ["unlockable", t.filterUnlockable],
            ] as Array<[RewardFilterKey, string]>).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilterBy(key)}
                className={`h-11 rounded-xl border px-3 text-xs font-semibold sm:text-sm ${
                  filterBy === key
                    ? "border-cyan-300/55 bg-cyan-300/15 text-cyan-100"
                    : "border-slate-500/70 bg-slate-900/45 text-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {filteredRewards.map((reward) => {
          const minLevel = reward.minLevel ?? 1;
          const hasStock = reward.stock === null || reward.stock === undefined || reward.stock > 0;
          const hasEnoughCoins = balance >= reward.cost;
          const hasRequiredLevel = userLevel >= minLevel;
          const canRedeem = hasEnoughCoins && hasStock && hasRequiredLevel;

          const rewardVisual = getRewardVisualMeta(reward, locale);
          const etaLabel = reward.eta ?? t.etaFallback;
          const stockLabel = reward.stock ?? "∞";
          const stateTag = !hasStock
            ? t.soldOut
            : !hasRequiredLevel
              ? `${t.lockedLevel} Lv.${minLevel}`
              : !hasEnoughCoins
                ? t.insufficient
                : t.redeemNow;

          return (
            <article key={reward.slug} className="overflow-hidden rounded-[1.7rem] border border-slate-500/70 bg-[#1c2937]/78 shadow-[0_20px_42px_rgba(7,12,20,0.28)] transition hover:-translate-y-1 hover:border-cyan-300/45">
              <div className="relative overflow-hidden border-b border-slate-500/60 p-5">
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${rewardVisual.gradient}`} />
                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/85">
                      {rewardVisual.overline}
                    </span>
                    <span className="inline-flex shrink-0 rounded-full border border-slate-400/65 bg-slate-900/60 px-2.5 py-1 text-xs font-semibold text-slate-200">
                      {stateTag}
                    </span>
                  </div>

                  <div className="mt-3 flex h-36 items-end justify-between rounded-2xl border border-slate-400/50 bg-slate-900/35 p-4">
                    <div>
                      <h3 className="text-[1.55rem] font-bold leading-tight text-slate-100">{reward.name}</h3>
                      <p className="mt-1 max-w-[32ch] text-sm text-slate-300">{reward.description}</p>
                    </div>
                    <div className="text-5xl font-black leading-none text-cyan-100/85">{rewardVisual.icon}</div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4">
                <div className="flex items-center gap-2 pb-3">
                  {reward.badge ? (
                    <span className="tactical-chip">
                      {reward.badge}
                    </span>
                  ) : null}
                  <span className="inline-flex rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                    {t.unlockLevel}: Lv.{minLevel}
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 border-t border-slate-500/55 pt-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">{locale === "en" ? "Price" : "售價"}</p>
                    <p className="mt-1 text-[2.25rem] font-black leading-none text-amber-200">{reward.cost.toLocaleString()}</p>
                    <p className="mt-1 text-xs text-slate-400">{t.coins}</p>
                  </div>
                  <div className="h-16 w-px bg-slate-500/55" />
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-slate-400">{t.stock}</p>
                    <p className="mt-1 text-[2.25rem] font-black leading-none text-slate-100">{stockLabel}</p>
                    <p className="mt-1 text-xs text-slate-400">{t.estDelivery} · {etaLabel}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <span>{t.estDelivery}: {etaLabel}</span>
                  <span>{t.secureRedemption}</span>
                </div>

                <button
                  type="button"
                  disabled={!canRedeem || pendingSlug === reward.slug}
                  onClick={() => handleRedeem(reward)}
                  className="tactical-btn-primary mt-3 h-12 w-full rounded-2xl px-5 text-base disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {pendingSlug === reward.slug
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
                        : t.loginToRedeem}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {filteredRewards.length === 0 ? (
        <div className="tactical-card p-10 text-center">
          <p className="text-2xl font-semibold text-slate-100">{t.emptyTitle}</p>
          <p className="mt-2 text-sm text-slate-300">{t.emptyDesc}</p>
        </div>
      ) : null}
    </div>
  );
}
