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

export function MissionCard({ mission, locale = "zh-HK" }: { mission: Mission; locale?: Locale }) {
  const brandLabel = locale === "en" ? mission.brand : (zhBrandMap[mission.brand] ?? mission.brand);
  const productLabel = locale === "en" ? mission.product : (zhProductMap[mission.product] ?? mission.product);
  const categoryLabel = locale === "en" ? mission.category : (zhCategoryMap[mission.category] ?? mission.category);
  const difficultyLabel = locale === "en" ? mission.difficulty : (zhDifficultyMap[mission.difficulty] ?? mission.difficulty);
  const brandInitial = mission.brand.trim().charAt(0).toUpperCase() || "M";
  const payoutText = `${mission.points.toLocaleString()} ${locale === "en" ? "Coins" : "金幣"}`;
  const difficultyClassName = mission.difficulty === "Hard"
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : mission.difficulty === "Medium"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-sky-200/80 bg-gradient-to-b from-white to-slate-50 shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition hover:border-cyan-300 hover:shadow-[0_18px_34px_rgba(14,165,233,0.2)]">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200 bg-gradient-to-br from-cyan-100 via-sky-100 to-amber-100 text-sm font-bold text-slate-900">
            {brandInitial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-800">{brandLabel}</p>
            <h3 className="mt-1 line-clamp-2 text-2xl font-bold leading-tight text-slate-900">{mission.title}</h3>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-700">
            {categoryLabel}
          </span>
          <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            {locale === "en" ? "On-site experience shoot" : "自費體驗拍攝"}
          </span>
          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
            UGC
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${difficultyClassName}`}>
            {locale === "en" ? "Difficulty" : "難度"} · {difficultyLabel}
          </span>
        </div>
      </div>

      <div className="border-t border-slate-200 px-4 py-3">
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3 border-b border-slate-200 pb-3">
            <p className="text-xl font-semibold text-slate-500">{locale === "en" ? "Reward per REELS" : "每條 REELS 派發"}</p>
            <p className="text-xl font-black text-emerald-600">{payoutText}</p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xl font-semibold text-slate-500">{locale === "en" ? "Difficulty" : "難度"}</p>
            <p className="text-xl font-bold text-slate-800">{difficultyLabel}</p>
          </div>

          {(mission.minParticipants ?? 0) > 0 && (
            <div className="pt-1 text-xs text-slate-500">
              {locale === "en" ? "Creator quota" : "創作者名額"}: {mission.currentParticipants ?? 0} / {mission.minParticipants}
            </div>
          )}

          <p className="line-clamp-2 pt-1 text-xs leading-5 text-slate-500">{productLabel} · {mission.description}</p>
        </div>
      </div>

      <div className="mt-auto border-t border-slate-200 p-4">
        <Link
          href={`/missions/${mission.slug}`}
          className="flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-orange-500 px-5 text-lg font-semibold text-white transition hover:from-blue-500 hover:to-orange-400"
        >
          {locale === "en" ? "Join campaign" : "參與活動"}
        </Link>
      </div>
    </article>
  );
}
