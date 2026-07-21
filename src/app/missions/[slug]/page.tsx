import Link from "next/link";
import { notFound } from "next/navigation";

import { MissionAcceptCard } from "@/components/mission-accept-card";
import { getMissionBySlug, getMissionCenterData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";
import { getMissionRequiredLevel, getRankingRewardsByDifficulty } from "@/lib/mission-rules";

export default async function MissionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const locale = await getCurrentLocale();
  const { slug } = await params;
  const mission = await getMissionBySlug(slug);

  if (!mission) {
    notFound();
  }

  const requiredLevel = getMissionRequiredLevel(mission.difficulty);
  const rewards = getRankingRewardsByDifficulty(mission.difficulty);
  const missionCenterData = await getMissionCenterData();
  const userLevel = missionCenterData.userLevel ?? 1;
  const isLevelLocked = userLevel < requiredLevel;

  return (
    <section className="section-shell py-12 sm:py-16">
      <Link href="/missions" className="text-sm font-semibold text-cyan-700">
        {locale === "en" ? "← Back to missions" : "← 返回任務中心"}
      </Link>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel p-5 sm:p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-700">{mission.brand}</p>
          <h1 className="mt-3 break-words text-3xl font-semibold text-slate-900 sm:text-4xl">{mission.title}</h1>
          <p className="mt-5 text-base leading-7 text-slate-700 sm:mt-6 sm:text-lg sm:leading-8">{mission.description}</p>

          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-700">
            {mission.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">{locale === "en" ? "Reward" : "獎勵"}</p>
              <p className="mt-2 break-words text-lg font-semibold leading-relaxed text-cyan-700 sm:text-2xl">
                {`#1 HK$${rewards.first.toLocaleString()} · #2 HK$${rewards.second.toLocaleString()} · #3 HK$${rewards.third.toLocaleString()}`}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                {isLevelLocked
                  ? (locale === "en"
                    ? `Rewards are visible now, but you need Lv.${requiredLevel} to accept this mission.`
                    : `獎勵現已可見，但需達到 Lv.${requiredLevel} 才可接取任務。`)
                  : (locale === "en"
                    ? `Split by likes ranking from total pool HK$${rewards.totalPrize.toLocaleString()} (60% / 30% / 10%)`
                    : `按 Like 排名由總獎金池 HK$${rewards.totalPrize.toLocaleString()} 派發（60% / 30% / 10%）`)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">{locale === "en" ? "Difficulty" : "難度"}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{mission.difficulty}</p>
              <p className="mt-2 text-xs text-slate-600">{locale === "en" ? `Required level: Lv.${requiredLevel}` : `需要等級：Lv.${requiredLevel}`}</p>
              <p className="mt-2 text-xs text-cyan-700">{locale === "en" ? `Your level: Lv.${userLevel}` : `目前等級：Lv.${userLevel}`}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {isLevelLocked ? (
            <div className="glass-panel p-5 sm:p-8">
              <h2 className="text-2xl font-semibold text-amber-700">{locale === "en" ? "Mission Locked" : "任務未解鎖"}</h2>
              <p className="mt-4 text-slate-700">
                {locale === "en"
                  ? `This ${mission.difficulty.toLowerCase()} mission unlocks at Lv.${requiredLevel}. Your current level is Lv.${userLevel}.`
                  : `此${mission.difficulty === "Medium" ? "中等" : mission.difficulty === "Hard" ? "困難" : "簡單"}任務需達 Lv.${requiredLevel} 方可接取；你目前等級為 Lv.${userLevel}。`}
              </p>
              <Link href="/missions" className="mt-5 inline-flex rounded-full border border-amber-300/60 bg-amber-50 px-5 py-2 text-sm font-semibold text-amber-700 transition hover:border-amber-400">
                {locale === "en" ? "Back to mission zones" : "返回任務分區"}
              </Link>
            </div>
          ) : null}

          <div className="glass-panel p-5 sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-900">{locale === "en" ? "Mission Requirements" : "任務要求"}</h2>
            <ul className="mt-5 space-y-3 text-slate-700">
              {[(locale === "en" ? "Video length must be longer than 60 seconds" : "影片長度需超過 60 秒")].map((item) => (
                <li key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">• {item}</li>
              ))}
            </ul>
          </div>

          <div className="glass-panel p-5 sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-900">{locale === "en" ? "Submission Steps" : "交稿流程"}</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {(locale === "en"
                ? ["Film & publish your IG Reels publicly", "Add @missionone.hk as collaborator and submit your Reel URL", `Rewards are settled by likes ranking from HK$${rewards.totalPrize.toLocaleString()}: #1 60%, #2 30%, #3 10%`]
                : ["拍攝並公開發佈 Instagram Reels", "將 @missionone_hk 設為協作者，並提交 Reels 連結", `獎勵按 Like 排名自 HK$${rewards.totalPrize.toLocaleString()} 獎金池派發：第 1 名 60%、第 2 名 30%、第 3 名 10%`]
              ).map((step, index) => (
                <div key={step} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-cyan-700">Step {index + 1}</p>
                  <p className="mt-3 text-slate-800">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {!isLevelLocked ? (
            <MissionAcceptCard
              missionSlug={mission.slug}
              locale={locale}
              minParticipants={mission.minParticipants}
              currentParticipants={mission.currentParticipants}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
