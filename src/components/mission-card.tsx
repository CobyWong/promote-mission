import Link from "next/link";

import type { Mission } from "@/lib/data";
import type { Locale } from "@/lib/i18n";
import { getMissionRequiredLevel, getRankingRewardsByDifficulty } from "@/lib/mission-rules";

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
  Entertainment: "娛樂",
  Music: "音樂",
};

const zhDifficultyMap: Record<string, string> = {
  Easy: "簡單",
  Medium: "中等",
  Hard: "高級",
};

const topCreatorMap: Record<string, string> = {
  spark: "@life.in.yummy",
  fitbyte: "@fit.journey.hk",
  nova: "@beautybymei",
  roam: "@tech.with.ken",
};

type MissionCardProps = {
  mission: Mission;
  locale?: Locale;
  userLevel?: number;
};

export function MissionCard({ mission, locale = "zh-HK", userLevel = 1 }: MissionCardProps) {
  const brandLabel = locale === "en" ? mission.brand : (zhBrandMap[mission.brand] ?? mission.brand);
  const productLabel = locale === "en" ? mission.product : (zhProductMap[mission.product] ?? mission.product);
  const categoryLabel = locale === "en" ? mission.category : (zhCategoryMap[mission.category] ?? mission.category);
  const difficultyLabel = locale === "en" ? mission.difficulty : (zhDifficultyMap[mission.difficulty] ?? mission.difficulty);
  const requiredLevel = getMissionRequiredLevel(mission.difficulty);
  const isLocked = userLevel < requiredLevel;
  const rewards = getRankingRewardsByDifficulty(mission.difficulty);
  const topCreator = topCreatorMap[mission.slug.split("-")[0]] ?? "@missionone.star";
  const topViews = mission.difficulty === "Easy" ? "35K" : mission.difficulty === "Medium" ? "52K" : "78K";

  return (
    <article className="tactical-card group flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5">
      <div className="space-y-4 p-5">
        <div className="min-w-0">
          <p className="truncate text-[1.55rem] font-semibold leading-none text-slate-200">{brandLabel}</p>
          <h3 className="mt-2 line-clamp-2 text-2xl font-bold leading-tight text-slate-100">{mission.title}</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="tactical-chip">{categoryLabel}</span>
          <span className="rounded-full border border-slate-500/70 bg-slate-800/70 px-3 py-1 text-sm font-semibold text-slate-300">UGC</span>
        </div>
      </div>

      <div className="border-y border-slate-700/80 px-5 py-4">
        <div className="flex items-end justify-between gap-3">
          <p className="text-xl font-semibold text-slate-400">{locale === "en" ? "Total prize pool" : "總獎金池"}</p>
          <p className="text-[2rem] font-black text-amber-300">{isLocked ? "???" : `HK$${rewards.totalPrize.toLocaleString()}`}</p>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-700/80 pt-3">
          <p className="text-lg font-semibold text-slate-400">{locale === "en" ? "Participation reward" : "參加獎勵"}</p>
          <p className="text-xl font-black text-amber-200">{isLocked ? "???" : `${mission.points.toLocaleString()} ${locale === "en" ? "Coins" : "金幣"}`}</p>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {locale === "en" ? "Coins can be used to redeem rewards in the reward shop." : "金幣可用於獎賞商城兌換獎勵。"}
        </p>
      </div>

      <div className="space-y-3 px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-slate-400">{locale === "en" ? "Difficulty" : "難度"}</p>
          <p className="text-xl font-bold text-slate-100">{difficultyLabel}</p>
        </div>

        <div className="text-sm font-medium text-amber-200">
          {locale === "en" ? `Required level: Lv.${requiredLevel}` : `需要等級：Lv.${requiredLevel}`}
        </div>

        {isLocked ? (
          <p className="rounded-xl border border-amber-300/50 bg-amber-300/12 px-3 py-2 text-sm font-medium text-amber-200">
            {locale === "en"
              ? `Rewards and details are hidden. Level up to Lv.${requiredLevel} to unlock this mission.`
              : `獎勵與詳情已隱藏，升級到 Lv.${requiredLevel} 後即可解鎖。`}
          </p>
        ) : (
          <>
            <div className="tactical-subcard px-3 py-2 text-sm text-slate-300">
              {locale === "en"
                ? `Ranking split: #1 60% (HK$${rewards.first.toLocaleString()}) · #2 30% (HK$${rewards.second.toLocaleString()}) · #3 10% (HK$${rewards.third.toLocaleString()})`
                : `排名派彩：第 1 名 60%（HK$${rewards.first.toLocaleString()}） · 第 2 名 30%（HK$${rewards.second.toLocaleString()}） · 第 3 名 10%（HK$${rewards.third.toLocaleString()}）`}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-400">{locale === "en" ? "Top creators" : "頂尖創作者"}</p>
              {(mission.rankings && mission.rankings.length > 0 ? mission.rankings : [{ rank: 1, handle: topCreator, views: Number(topViews.replace("K", "000")), reelUrl: `https://instagram.com/${topCreator.replace(/^@/, "")}` }]).map((entry) => (
                <div key={`${mission.slug}-${entry.rank}-${entry.handle}`} className="flex items-center justify-between rounded-xl border border-slate-600/60 bg-slate-900/50 px-3 py-2 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-300/20 text-xs font-bold text-amber-200">{entry.rank}</span>
                    <a
                      href={entry.reelUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-amber-200 underline decoration-amber-300/40 underline-offset-2 hover:text-amber-100"
                    >
                      {entry.handle}
                    </a>
                  </div>
                  <span className="text-slate-400">{entry.views >= 1000 ? `${(entry.views / 1000).toFixed(1)}K` : entry.views}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {(mission.minParticipants ?? 0) > 0 ? (
          <div className="text-xs text-slate-400">
            {locale === "en" ? "Creator quota" : "創作者名額"}: {mission.currentParticipants ?? 0} / {mission.minParticipants}
          </div>
        ) : null}

        {!isLocked ? <p className="line-clamp-2 text-xs leading-5 text-slate-400">{productLabel} · {mission.description}</p> : null}
      </div>

      <div className="mt-auto border-t border-slate-700/80 p-4">
        {isLocked ? (
          <button
            type="button"
            disabled
            className="flex h-12 w-full cursor-not-allowed items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-5 text-lg font-semibold text-slate-500"
          >
            {locale === "en" ? `Level up to unlock (Lv.${requiredLevel})` : `升級至 Lv.${requiredLevel} 解鎖`}
          </button>
        ) : (
          <Link
            href={`/missions/${mission.slug}`}
            className="tactical-btn-primary flex h-12 w-full px-5 text-lg"
          >
            {locale === "en" ? "Join campaign" : "參與活動"}
          </Link>
        )}
      </div>
    </article>
  );
}
