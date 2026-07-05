import { RewardShopClient } from "@/components/reward-shop-client";
import { getRewardsPageData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

export default async function RewardsPage() {
  const locale = await getCurrentLocale();
  const rewardsPageData = await getRewardsPageData();

  return (
    <section className="section-shell py-12 sm:py-16">
      <div className="max-w-3xl">
        <p className="tactical-section-kicker">{locale === "en" ? "Rewards Shop" : "獎賞商城"}</p>
        <h1 className="tactical-section-title">{locale === "en" ? "Rewards Marketplace" : "獎賞商城"}</h1>
        <p className="tactical-section-lead">
          {locale === "en"
            ? "Complete missions to earn Coins and redeem vouchers, USDT, headphones, and more."
            : "完成任務累積金幣，之後就可以兌換禮券、USDT、耳機等真實獎賞。之後亦可以擴充成多級會員或限量商品模式。"}
        </p>
      </div>

      {rewardsPageData.mode === "demo" ? (
        <div className="mt-8 rounded-xl border border-amber-300/50 bg-amber-300/10 px-4 py-4 text-sm text-amber-200">
          {locale === "en"
            ? "Demo balance/history is shown until Supabase is configured."
            : "獎賞頁暫時顯示示範結餘同示範紀錄。設定 Supabase schema 後會使用真實獎賞目錄同兌換流程。"}
        </div>
      ) : null}

      <div className="mt-10">
        <RewardShopClient
          rewards={rewardsPageData.rewards}
          balance={rewardsPageData.balance}
          redemptions={rewardsPageData.redemptions}
          isAuthenticated={rewardsPageData.isAuthenticated}
          locale={locale}
        />
      </div>
    </section>
  );
}
