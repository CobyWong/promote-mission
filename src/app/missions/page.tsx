import { MissionCard } from "@/components/mission-card";
import { getMissionCenterData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";
import { DIFFICULTY_REQUIRED_LEVEL, getMissionRequiredLevel } from "@/lib/mission-rules";

const zhMissionIntro = "揀返最適合你嘅受眾同內容風格任務。";

export default async function MissionsPage() {
  const locale = await getCurrentLocale();
  const missionCatalog = await getMissionCenterData();
  const userLevel = missionCatalog.userLevel ?? 1;

  const difficultySections = [
    { key: "Easy", requiredLevel: DIFFICULTY_REQUIRED_LEVEL.Easy },
    { key: "Medium", requiredLevel: DIFFICULTY_REQUIRED_LEVEL.Medium },
    { key: "Hard", requiredLevel: DIFFICULTY_REQUIRED_LEVEL.Hard },
  ] as const;

  const levelSections = difficultySections.map((section) => ({
    ...section,
    missions: missionCatalog.missions.filter((mission) => getMissionRequiredLevel(mission.difficulty) === section.requiredLevel),
  }));

  return (
    <section className="section-shell py-10 sm:py-12">
      <div className="max-w-4xl">
        <p className="tactical-section-kicker">{locale === "en" ? "Campaign Marketplace" : "任務市集"}</p>
        <h1 className="tactical-section-title">{locale === "en" ? "Mission Center" : "任務中心"}</h1>
        <p className="tactical-section-lead">
          {locale === "en"
            ? "Pick campaigns that fit your audience and content style."
            : zhMissionIntro}
        </p>
      </div>

      <div className="mt-8 space-y-10">
        {levelSections.map((section) => (
          <section key={section.key}>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-slate-100">
                {locale === "en" ? `${section.key} missions` : `${section.key} 任務`}
              </h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  userLevel >= section.requiredLevel
                    ? "border border-emerald-300/40 bg-emerald-300/10 text-emerald-200"
                    : "border border-amber-300/50 bg-amber-300/10 text-amber-200"
                }`}
              >
                {userLevel >= section.requiredLevel
                  ? (locale === "en" ? "Unlocked" : "已解鎖")
                  : (locale === "en" ? `Locked (need Lv.${section.requiredLevel})` : `未解鎖（需 Lv.${section.requiredLevel}）`)}
              </span>
            </div>

            {section.missions.length === 0 ? (
              <div className="tactical-subcard px-4 py-4 text-sm text-slate-400">
                {locale === "en" ? "No missions in this level right now." : "目前此等級暫時未有任務。"}
              </div>
            ) : (
              <div className="grid auto-rows-fr gap-6 lg:grid-cols-3">
                {section.missions.map((mission) => (
                  <MissionCard key={mission.slug} mission={mission} locale={locale} userLevel={userLevel} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}
