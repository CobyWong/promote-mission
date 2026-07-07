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
  compactMobile?: boolean;
};

export function MissionCard({ mission, locale = "zh-HK", userLevel = 1, compactMobile = false }: MissionCardProps) {
  const brandLabel = locale === "en" ? mission.brand : (zhBrandMap[mission.brand] ?? mission.brand);
  const productLabel = locale === "en" ? mission.product : (zhProductMap[mission.product] ?? mission.product);
  const categoryLabel = locale === "en" ? mission.category : (zhCategoryMap[mission.category] ?? mission.category);
  const difficultyLabel = locale === "en" ? mission.difficulty : (zhDifficultyMap[mission.difficulty] ?? mission.difficulty);
  const requiredLevel = getMissionRequiredLevel(mission.difficulty);
  const isLocked = userLevel < requiredLevel;
  const rewards = getRankingRewardsByDifficulty(mission.difficulty);
  const topCreator = topCreatorMap[mission.slug.split("-")[0]] ?? "@missionone.star";
  const topViews = mission.difficulty === "Easy" ? "35K" : mission.difficulty === "Medium" ? "52K" : "78K";

  if (compactMobile) {
    return (
      <article className="tactical-card group flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-xl font-extrabold leading-tight text-slate-100">{mission.title}</h3>
            <p className="mt-1 truncate text-sm font-semibold text-slate-300">{brandLabel}</p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
              isLocked
                ? "border-amber-300/50 bg-amber-300/12 text-amber-200"
                : "border-emerald-300/40 bg-emerald-300/10 text-emerald-200"
            }`}
          >
            {isLocked
              ? (locale === "en" ? `Lv.${requiredLevel} required` : `需 Lv.${requiredLevel}`)
              : (locale === "en" ? "Unlocked" : "已解鎖")}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="tactical-chip">{categoryLabel}</span>
          <span className="rounded-full border border-slate-500/70 bg-slate-800/70 px-2.5 py-1 font-semibold text-slate-300">UGC</span>
          <span className="rounded-full border border-slate-500/70 bg-slate-800/70 px-2.5 py-1 font-semibold text-slate-300">{difficultyLabel}</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="tactical-subcard px-3 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{locale === "en" ? "Top prize" : "最高獎勵"}</p>
            <p className="mt-1 text-[1.45rem] font-black leading-none text-amber-300">{isLocked ? "???" : `HK$${rewards.totalPrize.toLocaleString()}`}</p>
          </div>
          <div className="tactical-subcard px-3 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{locale === "en" ? "Reward" : "參加獎勵"}</p>
            <p className="mt-1 text-[1.45rem] font-black leading-none text-amber-200">{isLocked ? "???" : `${mission.points.toLocaleString()}`}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{locale === "en" ? "Coins" : "金幣"}</p>
          </div>
        </div>

        {(mission.minParticipants ?? 0) > 0 ? (
          <p className="mt-2 text-xs text-slate-400">
            {locale === "en" ? "Creator quota" : "創作者名額"}: {mission.currentParticipants ?? 0} / {mission.minParticipants}
          </p>
        ) : null}

        {!isLocked ? (
          <p className="mt-2 line-clamp-1 text-xs text-slate-400">{productLabel} · {mission.description}</p>
        ) : (
          <p className="mt-2 line-clamp-1 text-xs text-amber-200">
            {locale === "en"
              ? `Level up to Lv.${requiredLevel} to unlock mission details.`
              : `升級至 Lv.${requiredLevel} 後可查看任務詳情。`}
          </p>
        )}

        <div className="mt-3">
          {isLocked ? (
            <button
              type="button"
              disabled
                className="flex h-11 w-full cursor-not-allowed items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-4 text-base font-bold text-slate-500"
            >
              {locale === "en" ? `Unlock at Lv.${requiredLevel}` : `Lv.${requiredLevel} 解鎖`}
            </button>
          ) : (
            <Link
              href={`/missions/${mission.slug}`}
                className="tactical-btn-primary flex h-11 w-full px-4 text-base"
            >
              {locale === "en" ? "Start now" : "開始任務"}
            </Link>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="tactical-card group flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5">
      <div className="space-y-3 p-4 sm:space-y-4 sm:p-5">
        <div className="min-w-0">
          <p className="truncate text-[1.1rem] font-semibold leading-none text-slate-200 sm:text-[1.55rem]">{brandLabel}</p>
          <h3 className="mt-1.5 line-clamp-2 text-xl font-bold leading-tight text-slate-100 sm:mt-2 sm:text-2xl">{mission.title}</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="tactical-chip">{categoryLabel}</span>
          <span className="rounded-full border border-slate-500/70 bg-slate-800/70 px-3 py-1 text-xs font-semibold text-slate-300 sm:text-sm">UGC</span>
        </div>
      </div>

      <div className="border-y border-slate-700/80 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-end justify-between gap-3">
          <p className="text-base font-semibold text-slate-400 sm:text-xl">{locale === "en" ? "Total prize pool" : "總獎金池"}</p>
          <p className="text-[1.65rem] font-black text-amber-300 sm:text-[2rem]">{isLocked ? "???" : `HK$${rewards.totalPrize.toLocaleString()}`}</p>
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-slate-700/80 pt-2.5 sm:mt-3 sm:pt-3">
          <p className="text-sm font-semibold text-slate-400 sm:text-lg">{locale === "en" ? "Participation reward" : "參加獎勵"}</p>
          <p className="text-lg font-black text-amber-200 sm:text-xl">{isLocked ? "???" : `${mission.points.toLocaleString()} ${locale === "en" ? "Coins" : "金幣"}`}</p>
        </div>
        <p className="mt-2 text-[11px] text-slate-400 sm:text-xs">
          {locale === "en" ? "Coins can be used to redeem rewards in the reward shop." : "金幣可用於獎賞商城兌換獎勵。"}
        </p>
      </div>

      <div className="space-y-3 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-slate-400 sm:text-lg">{locale === "en" ? "Difficulty" : "難度"}</p>
          <p className="text-lg font-bold text-slate-100 sm:text-xl">{difficultyLabel}</p>
        </div>

        <div className="text-xs font-medium text-amber-200 sm:text-sm">
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
            <div className={`${compactMobile ? "hidden sm:block" : "block"} tactical-subcard px-3 py-2 text-sm text-slate-300`}>
              {locale === "en"
                ? `Ranking split: #1 60% (HK$${rewards.first.toLocaleString()}) · #2 30% (HK$${rewards.second.toLocaleString()}) · #3 10% (HK$${rewards.third.toLocaleString()})`
                : `排名派彩：第 1 名 60%（HK$${rewards.first.toLocaleString()}） · 第 2 名 30%（HK$${rewards.second.toLocaleString()}） · 第 3 名 10%（HK$${rewards.third.toLocaleString()}）`}
            </div>
            <div className={`${compactMobile ? "hidden sm:block" : "block"} space-y-2`}>
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
            {compactMobile ? (
              <div className="rounded-xl border border-slate-600/60 bg-slate-900/45 px-3 py-2.5 text-xs text-slate-300 sm:hidden">
                {locale === "en"
                  ? `Top creator: ${topCreator} · ${topViews} views`
                  : `頂尖創作者：${topCreator} · ${topViews} 觀看`}
              </div>
            ) : null}
          </>
        )}

        {(mission.minParticipants ?? 0) > 0 ? (
          <div className="text-xs text-slate-400">
            {locale === "en" ? "Creator quota" : "創作者名額"}: {mission.currentParticipants ?? 0} / {mission.minParticipants}
          </div>
        ) : null}

        {!isLocked ? <p className={`${compactMobile ? "line-clamp-1 sm:line-clamp-2" : "line-clamp-2"} text-xs leading-5 text-slate-400`}>{productLabel} · {mission.description}</p> : null}
      </div>

      <div className="mt-auto border-t border-slate-700/80 p-3.5 sm:p-4">
        {isLocked ? (
          <button
            type="button"
            disabled
            className="flex h-10 w-full cursor-not-allowed items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-4 text-base font-semibold text-slate-500 sm:h-12 sm:px-5 sm:text-lg"
          >
            {locale === "en" ? `Level up to unlock (Lv.${requiredLevel})` : `升級至 Lv.${requiredLevel} 解鎖`}
          </button>
        ) : (
          <Link
            href={`/missions/${mission.slug}`}
            className="tactical-btn-primary flex h-10 w-full px-4 text-base sm:h-12 sm:px-5 sm:text-lg"
          >
            {locale === "en" ? "Join campaign" : "參與活動"}
          </Link>
        )}
      </div>
    </article>
  );
}
