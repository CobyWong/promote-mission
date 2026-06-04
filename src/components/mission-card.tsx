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

  return (
    <article className="group rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/10 transition hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">{brandLabel}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{mission.title}</h3>
        </div>
        <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm font-medium text-cyan-200">
          {mission.points} {locale === "en" ? "Coins" : "金幣"}
        </span>
      </div>

      <p className="text-sm leading-6 text-slate-300">{mission.description}</p>

      <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-300">
        <span className="rounded-full bg-white/5 px-3 py-1">{categoryLabel}</span>
        <span className="rounded-full bg-white/5 px-3 py-1">{difficultyLabel}</span>
        <span className="rounded-full bg-white/5 px-3 py-1">{locale === "en" ? "ETA" : "時限"} {etaLabel}</span>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm">
        <span className="text-slate-400">{productLabel}</span>
        <Link
          href={`/missions/${mission.slug}`}
          className="font-semibold text-cyan-300 transition group-hover:text-cyan-200"
        >
          {locale === "en" ? "View details →" : "查看詳情 →"}
        </Link>
      </div>
    </article>
  );
}
