import Link from "next/link";

import type { Mission } from "@/lib/data";
import type { Locale } from "@/lib/i18n";

const zhBrandMap: Record<string, string> = {
  "Spark Living": "Spark Living 生活選物",
  "Nova Beauty": "Nova Beauty 美妍",
  FitByte: "FitByte 健身零食",
  "Roam Tech": "Roam Tech 科技",
};

const zhProductMap: Record<string, string> = {
  "Hydration Bottle Pro": "智能保溫水樽 Pro",
  "Glow Reset Serum": "煥亮修護精華",
  "Protein Chips Combo": "高蛋白薯片組合",
  "MiniBeam Projector": "MiniBeam 迷你投影機",
};

const zhCategoryMap: Record<string, string> = {
  Lifestyle: "生活風格",
  Beauty: "美妝",
  Fitness: "健身",
  Tech: "科技",
};

const zhDifficultyMap: Record<string, string> = {
  Easy: "簡單",
  Medium: "中等",
  Hard: "高級",
};

const zhEtaMap: Record<string, string> = {
  "1 day": "1 日",
  "2 days": "2 日",
  "3 days": "3 日",
};

export function MissionCard({ mission, locale = "zh-HK" }: { mission: Mission; locale?: Locale }) {
  const brandLabel = locale === "en" ? mission.brand : (zhBrandMap[mission.brand] ?? mission.brand);
  const productLabel = locale === "en" ? mission.product : (zhProductMap[mission.product] ?? mission.product);
  const categoryLabel = locale === "en" ? mission.category : (zhCategoryMap[mission.category] ?? mission.category);
  const difficultyLabel = locale === "en" ? mission.difficulty : (zhDifficultyMap[mission.difficulty] ?? mission.difficulty);
  const etaLabel = locale === "en" ? mission.eta : (zhEtaMap[mission.eta] ?? mission.eta);
  const brandInitial = mission.brand.trim().charAt(0).toUpperCase() || "M";
  const payoutText = `${mission.points.toLocaleString()} ${locale === "en" ? "Coins" : "金幣"}`;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#f7f8fb] shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-300 text-base font-bold text-slate-900">
            {brandInitial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-slate-800">{brandLabel}</p>
            <h3 className="mt-1 line-clamp-2 text-3xl font-bold leading-tight text-slate-900 sm:text-[2rem]">{mission.title}</h3>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-600">
            {categoryLabel}
          </span>
          <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
            {locale === "en" ? "On-site experience shoot" : "自費體驗拍攝"}
          </span>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-600">
            UGC
          </span>
        </div>
      </div>

      <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3 border-b border-slate-200 pb-4">
            <p className="text-2xl font-semibold text-slate-500">{locale === "en" ? "Reward per REELS" : "每條 REELS 派發"}</p>
            <p className="text-2xl font-black text-emerald-600">{payoutText}</p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-2xl font-semibold text-slate-500">{locale === "en" ? "Difficulty" : "難度"}</p>
            <p className="text-2xl font-bold text-slate-800">{difficultyLabel}</p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-2xl font-semibold text-slate-500">{locale === "en" ? "ETA" : "時限"}</p>
            <p className="text-2xl font-bold text-slate-800">{etaLabel}</p>
          </div>

          {(mission.minParticipants ?? 0) > 0 && (
            <div className="pt-1 text-sm text-slate-500">
              {locale === "en" ? "Creator quota" : "創作者名額"}: {mission.currentParticipants ?? 0} / {mission.minParticipants}
            </div>
          )}

          <p className="line-clamp-2 pt-1 text-sm leading-6 text-slate-500">{productLabel} · {mission.description}</p>
        </div>
      </div>

      <div className="mt-auto border-t border-slate-200 p-5 sm:p-6">
        <Link
          href={`/missions/${mission.slug}`}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-blue-600 px-6 text-xl font-semibold text-white transition hover:bg-blue-700"
        >
          {locale === "en" ? "Join campaign" : "參與活動"}
        </Link>
      </div>
    </article>
  );
}
