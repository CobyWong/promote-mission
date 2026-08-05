import Link from "next/link";
import { notFound } from "next/navigation";

import { MissionAcceptCard } from "@/components/mission-accept-card";
import { getMissionBySlug, getMissionCenterData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";
import { getRequiredMissionCaptionTagFromMission } from "@/lib/mission-caption-tag";
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
  const requiredCaptionTag = getRequiredMissionCaptionTagFromMission(mission);
  const missionRequirements = [
    locale === "en" ? "Video length must be longer than 60 seconds" : "影片長度需超過 60 秒",
    locale === "en" ? "Instagram account must be public" : "Instagram 帳號必須為公開帳號",
    ...(requiredCaptionTag
      ? [
        locale === "en"
          ? `Caption must include ${requiredCaptionTag}`
          : `Caption 必須包含 ${requiredCaptionTag}`,
      ]
      : []),
    ...mission.requirements,
  ];
  const deadlineLabel = mission.endsAt
    ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-HK", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(mission.endsAt))
    : null;
  const confirmationLabel = mission.rankingConfirmationEndsAt
    ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-HK", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(mission.rankingConfirmationEndsAt))
    : null;
  const rankingEntries = mission.rankings?.slice(0, 3) ?? [];
  const likesNumberFormat = new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-HK");

  return (
    <section className="section-shell py-12 sm:py-16">
      <Link href="/missions" className="text-sm font-semibold text-cyan-700">
        {locale === "en" ? "← Back to missions" : "← 返回任務中心"}
      </Link>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel p-5 sm:p-8">
          <h1 className="break-words text-3xl font-semibold text-slate-900 sm:text-4xl">{mission.title}</h1>

          <div className="mt-8">
            <p className="text-sm font-semibold text-slate-600">
              {locale === "en" ? "Mission Description" : "任務描述"}
            </p>
            <p className="mt-2 break-words leading-relaxed text-slate-800">
              {mission.description}
            </p>
          </div>

          <div className="mt-8">
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

          {mission.lifecyclePhase === "ranking_confirmation" ? (
            <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-800">
              {locale === "en"
                ? `Deadline passed. Ranking is now fixed by Likes and stays visible until ${confirmationLabel ?? "the confirmation window ends"}.`
                : `截止時間已過，排名已按 Likes 鎖定，並會展示至 ${confirmationLabel ?? "確認期結束"}。`}
            </div>
          ) : null}
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
            <ul className="mt-5 list-disc space-y-2 pl-5 text-slate-700 marker:text-slate-500">
              {missionRequirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="glass-panel p-5 sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-900">{locale === "en" ? "Mission Ranking (Likes)" : "任務排名（Likes）"}</h2>
            {rankingEntries.length > 0 ? (
              <div className="mt-5 divide-y divide-slate-200">
                {rankingEntries.map((entry) => (
                  <div key={`${mission.slug}-${entry.rank}-${entry.handle}`} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-700">
                        {entry.rank}
                      </span>
                      <a
                        href={entry.reelUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-sm font-semibold text-slate-800 underline decoration-slate-300 underline-offset-4 hover:text-cyan-700"
                      >
                        {entry.handle}
                      </a>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{likesNumberFormat.format(entry.likes)} Likes</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-500">
                {locale === "en" ? "No ranking records yet." : "目前尚無排名紀錄。"}
              </p>
            )}
          </div>

          <div className="glass-panel p-5 sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-900">{locale === "en" ? "Submission Steps" : "交稿流程"}</h2>
            <ol className="mt-6 list-decimal space-y-3 pl-5 marker:font-semibold marker:text-cyan-700">
              {(locale === "en"
                ? [
                  `Apply before deadline (${deadlineLabel ?? "mission deadline"})`,
                  `Publish IG Reels from your public personal Instagram account, add @missionone_hk as collaborator, and include ${requiredCaptionTag ?? "the mission hashtag"}. MissionOne auto-syncs missionone_hk and classifies the Reel by mission hashtag.`,
                  `After deadline, ranking is fixed by Likes and top 3 share HK$${rewards.totalPrize.toLocaleString()} (60% / 30% / 10%)`,
                ]
                : [
                  `請於截止時間（${deadlineLabel ?? "任務截止"}）前申請`,
                  `使用你的公開個人 Instagram 帳號發佈 Reels，將 @missionone_hk 設為協作者，並在 Caption 加上 ${requiredCaptionTag ?? "任務指定標籤"}；MissionOne 會從 missionone_hk 自動同步並按任務標籤分類。`,
                  `截止後排名按 Likes 鎖定，前 3 名瓜分 HK$${rewards.totalPrize.toLocaleString()}（60% / 30% / 10%）`,
                ]
              ).map((step, index) => (
                <li key={`${index}-${step}`} className="leading-relaxed text-slate-800">{step}</li>
              ))}
            </ol>
          </div>

          {!isLevelLocked ? (
            <MissionAcceptCard
              missionSlug={mission.slug}
              locale={locale}
              minParticipants={mission.minParticipants}
              currentParticipants={mission.currentParticipants}
              lifecyclePhase={mission.lifecyclePhase}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
