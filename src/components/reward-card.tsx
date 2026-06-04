import type { Reward } from "@/lib/data";
import type { Locale } from "@/lib/i18n";

export function RewardCard({ reward, locale = "zh-HK" }: { reward: Reward; locale?: Locale }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{reward.name}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">{reward.description}</p>
        </div>
        {reward.badge ? (
          <span className="rounded-full border border-amber-500/40 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-amber-200">
            {reward.badge}
          </span>
        ) : null}
      </div>
      <div className="mt-6 flex items-center justify-between text-sm">
        <span className="text-slate-400">
          {locale === "en" ? "Estimated processing" : "預計處理時間"} {reward.eta ?? (locale === "en" ? "1-3 business days" : "1-3 個工作天")}
        </span>
        <span className="font-semibold text-cyan-300">{reward.cost.toLocaleString()} {locale === "en" ? "Coins" : "金幣"}</span>
      </div>
    </article>
  );
}
