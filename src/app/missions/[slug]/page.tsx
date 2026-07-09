import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";

import { MissionAcceptCard } from "@/components/mission-accept-card";
import { getMissionBySlug, getMissionCenterData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";
import { getMissionImage } from "@/lib/mission-media";
import { getMissionRequiredLevel, getRankingRewardsByDifficulty } from "@/lib/mission-rules";

export default async function MissionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const locale = await getCurrentLocale();
  const { slug } = await params;
  const mission = await getMissionBySlug(slug);

  if (!mission) {
    notFound();
  }

  const missionImage = mission.imageUrl ?? getMissionImage(mission.slug);
  const requiredLevel = getMissionRequiredLevel(mission.difficulty);
  const rewards = getRankingRewardsByDifficulty(mission.difficulty);
  const missionCenterData = await getMissionCenterData();
  const userLevel = missionCenterData.userLevel ?? 1;
  const isLevelLocked = userLevel < requiredLevel;

  return (
    <section className="section-shell py-12 sm:py-16">
      <Link href="/missions" className="text-sm font-semibold text-cyan-300">
        {locale === "en" ? "← Back to missions" : "← 返回任務中心"}
      </Link>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel p-8">
          <div className="relative -mx-4 -mt-4 mb-7 h-64 overflow-hidden rounded-3xl border border-white/10 sm:-mx-2">
            <Image
              src={missionImage}
              alt={mission.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/20 to-transparent" />
          </div>

          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{mission.brand}</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">{mission.title}</h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">{mission.description}</p>

          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-200">
            {mission.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white/5 px-4 py-2">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white/5 p-5">
              <p className="text-sm text-slate-400">{locale === "en" ? "Reward" : "獎勵"}</p>
              <p className="mt-2 text-2xl font-semibold text-cyan-300">
                {isLevelLocked
                  ? (locale === "en" ? "Unlock required" : "需解鎖後查看")
                  : `#1 HK$${rewards.first.toLocaleString()} · #2 HK$${rewards.second.toLocaleString()} · #3 HK$${rewards.third.toLocaleString()}`}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {isLevelLocked
                  ? (locale === "en"
                    ? `Reach Lv.${requiredLevel} to view ranking rewards.`
                    : `達到 Lv.${requiredLevel} 後可查看排名獎勵。`)
                  : (locale === "en"
                    ? `Split by likes ranking from total pool HK$${rewards.totalPrize.toLocaleString()} (60% / 30% / 10%)`
                    : `按 Like 排名由總獎金池 HK$${rewards.totalPrize.toLocaleString()} 派發（60% / 30% / 10%）`)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/5 p-5">
              <p className="text-sm text-slate-400">{locale === "en" ? "Difficulty" : "難度"}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{mission.difficulty}</p>
              <p className="mt-2 text-xs text-slate-400">{locale === "en" ? `Required level: Lv.${requiredLevel}` : `需要等級：Lv.${requiredLevel}`}</p>
              <p className="mt-2 text-xs text-cyan-200">{locale === "en" ? `Your level: Lv.${userLevel}` : `目前等級：Lv.${userLevel}`}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {isLevelLocked ? (
            <div className="glass-panel p-8">
              <h2 className="text-2xl font-semibold text-amber-100">{locale === "en" ? "Mission Locked" : "任務未解鎖"}</h2>
              <p className="mt-4 text-slate-200">
                {locale === "en"
                  ? `This ${mission.difficulty.toLowerCase()} mission unlocks at Lv.${requiredLevel}. Your current level is Lv.${userLevel}.`
                  : `此${mission.difficulty === "Medium" ? "中等" : mission.difficulty === "Hard" ? "困難" : "簡單"}任務需達 Lv.${requiredLevel} 方可接取；你目前等級為 Lv.${userLevel}。`}
              </p>
              <Link href="/missions" className="mt-5 inline-flex rounded-full border border-amber-300/45 px-5 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-200">
                {locale === "en" ? "Back to mission zones" : "返回任務分區"}
              </Link>
            </div>
          ) : null}

          <div className="glass-panel p-8">
            <h2 className="text-2xl font-semibold text-white">{locale === "en" ? "Mission Requirements" : "任務要求"}</h2>
            <ul className="mt-5 space-y-3 text-slate-300">
              {[(locale === "en" ? "Video length must be longer than 60 seconds" : "影片長度需超過 60 秒")].map((item) => (
                <li key={item} className="rounded-2xl bg-white/5 px-4 py-3">• {item}</li>
              ))}
            </ul>
          </div>

          <div className="glass-panel p-8">
            <h2 className="text-2xl font-semibold text-white">{locale === "en" ? "Submission Steps" : "交稿流程"}</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {(locale === "en"
                ? ["Film & publish your IG Reels publicly", "Add @missionone.hk as collaborator and submit your Reel URL", `Rewards are settled by likes ranking from HK$${rewards.totalPrize.toLocaleString()}: #1 60%, #2 30%, #3 10%`]
                : ["拍攝並公開發佈 Instagram Reels", "將 @missionone_hk 設為協作者，並提交 Reels 連結", `獎勵按 Like 排名自 HK$${rewards.totalPrize.toLocaleString()} 獎金池派發：第 1 名 60%、第 2 名 30%、第 3 名 10%`]
              ).map((step, index) => (
                <div key={step} className="rounded-2xl bg-white/5 p-5">
                  <p className="text-sm text-cyan-300">Step {index + 1}</p>
                  <p className="mt-3 text-white">{step}</p>
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
