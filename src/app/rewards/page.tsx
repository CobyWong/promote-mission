import { RewardShopClient } from "@/components/reward-shop-client";
import { getRewardsPageData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

export default async function RewardsPage() {
  const locale = await getCurrentLocale();
  const rewardsPageData = await getRewardsPageData();

  return (
    <section className="section-shell py-12 sm:py-16">
      <div className="max-w-3xl">
        <p className="tactical-section-kicker">{locale === "en" ? "Rewards Store" : "獎賞網店"}</p>
        <h1 className="tactical-section-title">{locale === "en" ? "Creator Rewards Store" : "創作者獎賞店"}</h1>
        <p className="tactical-section-lead">
          {locale === "en"
            ? "Shop vouchers, USDT, and gear with your Coins. Compare options and redeem in one click."
            : "用 Coins 換購禮券、USDT 與裝備；可先比較商品，再一鍵兌換。"}
        </p>
      </div>

      {rewardsPageData.mode === "unavailable" ? (
        <div className="mt-8 rounded-xl border border-amber-300/50 bg-amber-300/10 px-4 py-4 text-sm text-amber-200">
          {locale === "en"
            ? "Rewards are unavailable until backend services are configured."
            : "後端服務完成設定前，獎賞功能暫時不可用。"}
        </div>
      ) : null}

      <div className="mt-10">
        <RewardShopClient
          rewards={rewardsPageData.rewards}
          balance={rewardsPageData.balance}
          redemptions={rewardsPageData.redemptions}
          isAuthenticated={rewardsPageData.isAuthenticated}
          userLevel={rewardsPageData.userLevel ?? 1}
          locale={locale}
        />
      </div>
    </section>
  );
}
