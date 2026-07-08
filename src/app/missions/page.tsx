import { MissionCard } from "@/components/mission-card";
import { getMissionCenterData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";
import { DIFFICULTY_REQUIRED_LEVEL, getMissionRequiredLevel } from "@/lib/mission-rules";
import Link from "next/link";

const zhMissionIntro = "揀返最適合你嘅受眾同內容風格任務。";

function normalizeLevel(input?: string) {
  if (input === "Easy" || input === "easy") return "Easy";
  if (input === "Medium" || input === "medium") return "Medium";
  if (input === "Hard" || input === "hard") return "Hard";
  return null;
}

export default async function MissionsPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const locale = await getCurrentLocale();
  const missionCatalog = await getMissionCenterData();
  const params = await searchParams;
  const userLevel = missionCatalog.userLevel ?? 1;
  const selectedLevel = normalizeLevel(params.level);

  const difficultySections = [
    { key: "Easy", requiredLevel: DIFFICULTY_REQUIRED_LEVEL.Easy },
    { key: "Medium", requiredLevel: DIFFICULTY_REQUIRED_LEVEL.Medium },
    { key: "Hard", requiredLevel: DIFFICULTY_REQUIRED_LEVEL.Hard },
  ] as const;

  const levelSections = difficultySections.map((section) => ({
    ...section,
    missions: missionCatalog.missions.filter((mission) => getMissionRequiredLevel(mission.difficulty) === section.requiredLevel),
  }));

  const selectedSection = selectedLevel ? levelSections.find((item) => item.key === selectedLevel) ?? null : null;

  const sectionLabel = (key: "Easy" | "Medium" | "Hard") => {
    if (locale === "en") {
      return key === "Easy" ? "Easy Missions" : key === "Medium" ? "Medium Missions" : "Hard Missions";
    }

    return key === "Easy" ? "簡單任務區" : key === "Medium" ? "中等任務區" : "困難任務區";
  };

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

      <div className="mx-auto mt-8 max-w-2xl space-y-6">
        {levelSections.map((section) => {
          const locked = userLevel < section.requiredLevel;
          const active = selectedSection?.key === section.key;

          const sharedClass = `relative block rounded-2xl border px-6 py-10 text-center transition ${active ? "border-cyan-300 bg-cyan-900/20" : "border-slate-500/70 bg-slate-900/35"}`;

          if (locked) {
            return (
              <div key={section.key} className={`${sharedClass} cursor-not-allowed opacity-85`}>
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-slate-500/60" />
                  <div className="absolute bottom-4 left-4 right-4 top-4 border border-slate-500/40" />
                </div>
                <p className="relative text-4xl font-semibold text-slate-100">{sectionLabel(section.key)} 🔒</p>
                <p className="relative mt-4 text-lg text-slate-300">
                  {locale === "en" ? `Unlock at Lv.${section.requiredLevel}` : `達到${section.requiredLevel}等解鎖`}
                </p>
              </div>
            );
          }

          return (
            <Link key={section.key} href={`/missions?level=${section.key}`} className={sharedClass}>
              <p className="text-4xl font-semibold text-slate-100">{sectionLabel(section.key)}</p>
            </Link>
          );
        })}
      </div>

      {selectedSection ? (
        <div className="mt-10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-slate-100">{sectionLabel(selectedSection.key)}</h2>
            <Link href="/missions" className="rounded-full border border-slate-500/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-300">
              {locale === "en" ? "Back to level selector" : "返回等級選單"}
            </Link>
          </div>

          {selectedSection.missions.length === 0 ? (
            <div className="tactical-subcard px-4 py-4 text-sm text-slate-400">
              {locale === "en" ? "No missions in this level right now." : "目前此等級暫時未有任務。"}
            </div>
          ) : (
            <div className="grid auto-rows-fr gap-3 sm:gap-5 lg:grid-cols-3">
              {selectedSection.missions.map((mission) => (
                <MissionCard
                  key={mission.slug}
                  mission={mission}
                  locale={locale}
                  userLevel={userLevel}
                  compactMobile
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
