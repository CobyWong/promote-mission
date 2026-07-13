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

const zhDifficultyMap: Record<string, string> = {
  Easy: "簡單",
  Medium: "中等",
  Hard: "高級",
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
  const difficultyLabel = locale === "en" ? mission.difficulty : (zhDifficultyMap[mission.difficulty] ?? mission.difficulty);
  const requiredLevel = getMissionRequiredLevel(mission.difficulty);
  const isLocked = userLevel < requiredLevel;
  const rewards = getRankingRewardsByDifficulty(mission.difficulty);
  const rankingEntries = mission.rankings && mission.rankings.length > 0
    ? mission.rankings.slice(0, 3)
    : [];

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

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="tactical-subcard px-3 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{locale === "en" ? "Top prize" : "最高獎勵"}</p>
            <p className="mt-1 text-[1.45rem] font-black leading-none text-amber-300">{`HK$${rewards.totalPrize.toLocaleString()}`}</p>
          </div>
          <div className="tactical-subcard px-3 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{locale === "en" ? "Reward" : "參加獎勵"}</p>
            <p className="mt-1 text-[1.45rem] font-black leading-none text-amber-200">{`${mission.points.toLocaleString()}`}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{locale === "en" ? "Coins" : "金幣"}</p>
          </div>
        </div>

        {!isLocked ? (
          <div className="mt-2 space-y-1.5 rounded-xl border border-slate-600/60 bg-slate-900/45 px-3 py-2 text-[11px] text-slate-300">
            <p className="text-[11px] font-semibold text-slate-400">{locale === "en" ? "Mission ranking" : "任務排名"}</p>
            {rankingEntries.length > 0 ? (
              rankingEntries.map((entry) => (
                <div key={`${mission.slug}-${entry.rank}-${entry.handle}`} className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-300/20 text-[10px] font-bold text-amber-200">{entry.rank}</span>
                    <a
                      href={entry.reelUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate font-semibold text-amber-200 underline decoration-amber-300/40 underline-offset-2 hover:text-amber-100"
                    >
                      {entry.handle}
                    </a>
                  </div>
                  <span className="shrink-0 text-slate-400">{entry.views >= 1000 ? `${(entry.views / 1000).toFixed(1)}K` : entry.views}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-400">{locale === "en" ? "No ranking entries yet." : "目前尚無排名紀錄。"}</p>
            )}
          </div>
        ) : null}

        {(mission.minParticipants ?? 0) > 0 ? (
          <p className="mt-2 text-xs text-slate-400">
            {locale === "en" ? "Creator quota" : "創作者名額"}: {mission.currentParticipants ?? 0} / {mission.minParticipants}
          </p>
        ) : null}

        <p className="mt-2 line-clamp-1 text-xs text-slate-400">{productLabel} · {mission.description}</p>
        {isLocked ? (
          <p className="mt-1 line-clamp-1 text-xs text-amber-200">
            {locale === "en"
              ? `Locked for acceptance until Lv.${requiredLevel}.`
              : `需達 Lv.${requiredLevel} 才可接取。`}
          </p>
        ) : null}

        <div className="mt-3">
          <Link
            href={`/missions/${mission.slug}`}
            className={`flex h-11 w-full items-center justify-center rounded-xl border px-4 text-base font-bold ${
              isLocked
                ? "border-amber-300/45 bg-amber-300/12 text-amber-100 hover:bg-amber-300/20"
                : "tactical-btn-primary"
            }`}
          >
            {isLocked
              ? (locale === "en" ? `Preview mission (Lv.${requiredLevel} to accept)` : `查看任務（Lv.${requiredLevel} 才可接取）`)
              : (locale === "en" ? "Start now" : "查看任務")}
          </Link>
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

      </div>

      <div className="border-y border-slate-700/80 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-end justify-between gap-3">
          <p className="text-base font-semibold text-slate-400 sm:text-xl">{locale === "en" ? "Total prize pool" : "總獎金池"}</p>
          <p className="text-[1.65rem] font-black text-amber-300 sm:text-[2rem]">{`HK$${rewards.totalPrize.toLocaleString()}`}</p>
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-slate-700/80 pt-2.5 sm:mt-3 sm:pt-3">
          <p className="text-sm font-semibold text-slate-400 sm:text-lg">{locale === "en" ? "Participation reward" : "參加獎勵"}</p>
          <p className="text-lg font-black text-amber-200 sm:text-xl">{`${mission.points.toLocaleString()} ${locale === "en" ? "Coins" : "金幣"}`}</p>
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
              ? `You can preview this mission now, but accepting is locked until Lv.${requiredLevel}.`
              : `你可以先預覽任務，但需達 Lv.${requiredLevel} 才可接取。`}
          </p>
        ) : null}

        <>
          <div className={`${compactMobile ? "hidden sm:block" : "block"} tactical-subcard px-3 py-2 text-sm text-slate-300`}>
            {locale === "en"
              ? `Ranking split: #1 60% (HK$${rewards.first.toLocaleString()}) · #2 30% (HK$${rewards.second.toLocaleString()}) · #3 10% (HK$${rewards.third.toLocaleString()})`
              : `排名派彩：第 1 名 60%（HK$${rewards.first.toLocaleString()}） · 第 2 名 30%（HK$${rewards.second.toLocaleString()}） · 第 3 名 10%（HK$${rewards.third.toLocaleString()}）`}
          </div>
          <div className={`${compactMobile ? "hidden sm:block" : "block"} space-y-2`}>
            <p className="text-sm text-slate-400">{locale === "en" ? "Top creators" : "頂尖創作者"}</p>
            {rankingEntries.length > 0 ? (
              rankingEntries.map((entry) => (
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
              ))
            ) : (
              <div className="rounded-xl border border-slate-600/60 bg-slate-900/50 px-3 py-2 text-sm text-slate-400">
                {locale === "en" ? "No top creators yet." : "目前尚無頂尖創作者資料。"}
              </div>
            )}
          </div>
        </>

        {(mission.minParticipants ?? 0) > 0 ? (
          <div className="text-xs text-slate-400">
            {locale === "en" ? "Creator quota" : "創作者名額"}: {mission.currentParticipants ?? 0} / {mission.minParticipants}
          </div>
        ) : null}

        <p className={`${compactMobile ? "line-clamp-1 sm:line-clamp-2" : "line-clamp-2"} text-xs leading-5 text-slate-400`}>{productLabel} · {mission.description}</p>
      </div>

      <div className="mt-auto border-t border-slate-700/80 p-3.5 sm:p-4">
        <Link
          href={`/missions/${mission.slug}`}
          className={`flex h-10 w-full items-center justify-center rounded-xl px-4 text-base font-semibold sm:h-12 sm:px-5 sm:text-lg ${
            isLocked
              ? "border border-amber-300/45 bg-amber-300/12 text-amber-100 hover:bg-amber-300/20"
              : "tactical-btn-primary"
          }`}
        >
          {isLocked
            ? (locale === "en" ? `Preview mission (Lv.${requiredLevel} to accept)` : `查看任務（Lv.${requiredLevel} 才可接取）`)
            : (locale === "en" ? "Join campaign" : "參與活動")}
        </Link>
      </div>
    </article>
  );
}
