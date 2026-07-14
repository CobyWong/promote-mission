import type { Reward } from "@/lib/data";
import type { Locale } from "@/lib/i18n";

export function RewardCard({ reward, locale = "zh-HK" }: { reward: Reward; locale?: Locale }) {
  return (
    <article className="tactical-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">{reward.name}</h3>
        </div>
        {reward.badge ? (
          <span className="tactical-chip">
            {reward.badge}
          </span>
        ) : null}
      </div>
      <div className="mt-6 flex items-center justify-between text-sm">
        <span className="text-slate-400">
          {locale === "en" ? "Estimated processing" : "預計處理時間"} {reward.eta ?? (locale === "en" ? "1-3 business days" : "1-3 個工作天")}
        </span>
        <span className="font-semibold text-amber-200">{reward.cost.toLocaleString()} {locale === "en" ? "Coins" : "金幣"}</span>
      </div>
    </article>
  );
}
