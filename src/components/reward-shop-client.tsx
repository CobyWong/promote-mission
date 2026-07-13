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

export function RewardShopClient({ balance, locale = "zh-HK" }: RewardShopClientProps) {
  const t = locale === "en"
    ? {
      walletTitle: "Wallet",
      availableCoins: "Remaining Coins",
      coins: "Coins",
    }
    : {
      walletTitle: "我的錢包",
      availableCoins: "剩餘金幣",
      coins: "金幣",
    };

  return (
    <div className="tactical-card p-6 sm:p-8">
      <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/90">{t.walletTitle}</p>
      <p className="mt-2 text-sm text-slate-400">{t.availableCoins}</p>
      <p className="mt-2 text-4xl font-semibold text-amber-200 sm:text-5xl">{balance.toLocaleString()}</p>
      <p className="mt-2 text-sm text-slate-400">{t.coins}</p>
    </div>
  );
}
