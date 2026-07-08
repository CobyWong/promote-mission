import Link from "next/link";
import { notFound } from "next/navigation";

import { MissionCard } from "@/components/mission-card";
import { getMissionCenterData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";
import { DIFFICULTY_REQUIRED_LEVEL, getMissionRequiredLevel } from "@/lib/mission-rules";

type DifficultyKey = "Easy" | "Medium" | "Hard";

function normalizeLevel(input: string): DifficultyKey | null {
  if (input === "easy") return "Easy";
  if (input === "medium") return "Medium";
  if (input === "hard") return "Hard";
  return null;
}

function getSectionLabel(level: DifficultyKey, locale: "en" | "zh-HK") {
  if (locale === "en") {
    return level === "Easy" ? "Easy Missions" : level === "Medium" ? "Medium Missions" : "Hard Missions";
  }

  return level === "Easy" ? "簡單任務區" : level === "Medium" ? "中等任務區" : "困難任務區";
}

export default async function MissionLevelPage({ params }: { params: Promise<{ level: string }> }) {
  const locale = await getCurrentLocale();
  const route = await params;
  const selectedLevel = normalizeLevel(route.level);

  if (!selectedLevel) {
    notFound();
  }

  const missionCatalog = await getMissionCenterData();
  const userLevel = missionCatalog.userLevel ?? 1;
  const requiredLevel = DIFFICULTY_REQUIRED_LEVEL[selectedLevel];
  const isLocked = userLevel < requiredLevel;

  if (isLocked) {
    return (
      <section className="section-shell py-10 sm:py-12">
        <div className="mx-auto max-w-3xl rounded-3xl border border-amber-300/35 bg-amber-300/10 px-8 py-12 text-center">
          <h1 className="text-4xl font-semibold text-amber-100">{getSectionLabel(selectedLevel, locale)} 🔒</h1>
          <p className="mt-4 text-lg text-amber-200">
            {locale === "en" ? `This zone unlocks at Lv.${requiredLevel}.` : `此任務區需達到 Lv.${requiredLevel} 才可進入。`}
          </p>
          <Link href="/missions" className="mt-6 inline-flex rounded-full border border-amber-300/50 px-5 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-200">
            {locale === "en" ? "Back to mission zones" : "返回任務分區"}
          </Link>
        </div>
      </section>
    );
  }

  const levelMissions = missionCatalog.missions.filter((mission) => getMissionRequiredLevel(mission.difficulty) === requiredLevel);

  return (
    <section className="section-shell py-10 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="tactical-section-kicker">{locale === "en" ? "Mission Zone" : "任務分區"}</p>
          <h1 className="tactical-section-title">{getSectionLabel(selectedLevel, locale)}</h1>
          <p className="tactical-section-lead">
            {locale === "en"
              ? "Choose missions in this difficulty zone and start creating."
              : "選擇此難度區任務，立即開始創作。"}
          </p>
        </div>

        <Link href="/missions" className="rounded-full border border-slate-500/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-300">
          {locale === "en" ? "Back to level selector" : "返回等級選單"}
        </Link>
      </div>

      <div className="mt-8">
        {levelMissions.length === 0 ? (
          <div className="tactical-subcard px-4 py-4 text-sm text-slate-400">
            {locale === "en" ? "No missions in this level right now." : "目前此等級暫時未有任務。"}
          </div>
        ) : (
          <div className="grid auto-rows-fr gap-3 sm:gap-5 lg:grid-cols-3">
            {levelMissions.map((mission) => (
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
    </section>
  );
}
