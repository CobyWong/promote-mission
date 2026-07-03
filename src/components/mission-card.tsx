import Link from "next/link";
import Image from "next/image";

import type { Mission } from "@/lib/data";
import type { Locale } from "@/lib/i18n";
import { getMissionImage } from "@/lib/mission-media";

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
  const imageUrl = mission.imageUrl ?? getMissionImage(mission.slug);

  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg">
      <div className="relative h-52 w-full overflow-hidden bg-slate-100">
        <Image
          src={imageUrl}
          alt={mission.title}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/65 via-slate-900/15 to-transparent" />

        <div className="absolute left-5 top-5">
          <span className="rounded-full border border-white/45 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-800">
            {categoryLabel}
          </span>
        </div>

        <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-200">{brandLabel}</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{mission.title}</h3>
          </div>
          <span className="shrink-0 rounded-full border border-white/45 bg-blue-600 px-3 py-1 text-sm font-medium text-white">
            {mission.points} {locale === "en" ? "Coins" : "金幣"}
          </span>
        </div>
      </div>

      <div className="p-6">
        <p className="text-sm leading-6 text-slate-600">{mission.description}</p>

        {(mission.minParticipants ?? 0) > 0 && (
          <div className={`mt-4 flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs ${
            (mission.currentParticipants ?? 0) >= (mission.minParticipants ?? 0)
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}>
            <span>{(mission.currentParticipants ?? 0) >= (mission.minParticipants ?? 0) ? "✅" : "🔒"}</span>
            <span className="font-medium">
              {(mission.currentParticipants ?? 0) >= (mission.minParticipants ?? 0)
                ? (locale === "en" ? "Open" : "已開放")
                : (locale === "en" ? "Waiting to open" : "等待人數開放")}
            </span>
            <span className="ml-auto text-slate-500">
              {mission.currentParticipants ?? 0} / {mission.minParticipants} {locale === "en" ? "creators" : "人"}
            </span>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1">{difficultyLabel}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">{locale === "en" ? "ETA" : "時限"} {etaLabel}</span>
        </div>

        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-slate-500">{productLabel}</span>
          <Link
            href={`/missions/${mission.slug}`}
            className="font-semibold text-blue-600 transition group-hover:text-blue-700"
          >
            {locale === "en" ? "View details →" : "查看詳情 →"}
          </Link>
        </div>
      </div>
    </article>
  );
}
