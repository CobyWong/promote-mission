import { getMissionCenterData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";
import { DIFFICULTY_REQUIRED_LEVEL, getMissionRequiredLevel } from "@/lib/mission-rules";
import Link from "next/link";

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

  const sectionLabel = (key: "Easy" | "Medium" | "Hard") => {
    if (locale === "en") {
      return key === "Easy" ? "Easy Missions" : key === "Medium" ? "Medium Missions" : "Hard Missions";
    }

    return key === "Easy" ? "簡單任務區" : key === "Medium" ? "中等任務區" : "困難任務區";
  };

  const sectionSubLabel = (key: "Easy" | "Medium" | "Hard") => {
    if (locale === "en") {
      return key === "Easy"
        ? "Quick wins and starter campaigns"
        : key === "Medium"
          ? "Higher-quality missions with bigger payouts"
          : "Elite challenges for advanced creators";
    }

    return key === "Easy"
      ? "快速上手，適合新手創作者"
      : key === "Medium"
        ? "要求更高，獎勵更高"
        : "高強度挑戰，高手專屬";
  };

  const sectionAccent = (key: "Easy" | "Medium" | "Hard") => {
    if (key === "Easy") {
      return "from-cyan-400/35 via-sky-300/10 to-transparent";
    }

    if (key === "Medium") {
      return "from-violet-300/20 via-cyan-300/10 to-transparent";
    }

    return "from-amber-300/25 via-rose-300/10 to-transparent";
  };

  const sectionIcon = (key: "Easy" | "Medium" | "Hard") => {
    if (key === "Easy") return "◎";
    if (key === "Medium") return "◈";
    return "✦";
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

      <div className="mx-auto mt-10 max-w-3xl space-y-6">
        {levelSections.map((section) => {
          const locked = userLevel < section.requiredLevel;
          const sharedClass = `group relative block overflow-hidden rounded-3xl border px-7 py-9 text-left transition duration-300 ${
            locked
              ? "border-slate-500/50 bg-slate-900/30"
              : "border-cyan-300/35 bg-slate-900/35 hover:-translate-y-0.5 hover:border-cyan-200/65"
          }`;

          if (locked) {
            return (
              <div key={section.key} className={`${sharedClass} cursor-not-allowed opacity-90`}>
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-4 rounded-2xl border border-slate-400/45" />
                  <div className="absolute left-7 right-7 top-1/2 h-[2px] -translate-y-1/2 bg-slate-300/50" />
                  <div className="absolute bottom-6 left-6 right-6 top-6">
                    <div className="absolute left-0 top-0 h-[2px] w-full origin-left rotate-[18deg] bg-slate-300/45" />
                    <div className="absolute left-0 top-0 h-[2px] w-full origin-left -rotate-[18deg] bg-slate-300/45" />
                  </div>
                </div>
                <p className="relative text-4xl font-semibold text-slate-100 sm:text-5xl">{sectionLabel(section.key)} 🔒</p>
                <p className="relative mt-2 text-sm text-slate-400">{sectionSubLabel(section.key)}</p>
                <p className="relative mt-4 text-lg text-slate-200">
                  {locale === "en" ? `Unlock at Lv.${section.requiredLevel}` : `達到${section.requiredLevel}等解鎖`}
                </p>
              </div>
            );
          }

          return (
            <Link key={section.key} href={`/missions/level/${section.key.toLowerCase()}`} className={sharedClass}>
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${sectionAccent(section.key)} opacity-80`} />
              <div className="absolute right-6 top-6 text-2xl text-cyan-200/80 transition group-hover:scale-110">{sectionIcon(section.key)}</div>
              <p className="relative text-4xl font-semibold text-slate-100 sm:text-5xl">{sectionLabel(section.key)}</p>
              <p className="relative mt-2 text-sm text-slate-300">{sectionSubLabel(section.key)}</p>
              <div className="relative mt-5 inline-flex items-center rounded-full border border-cyan-300/35 bg-cyan-900/30 px-4 py-2 text-xs font-semibold text-cyan-100">
                {locale === "en" ? `Enter ${section.key}` : `進入 ${sectionLabel(section.key)}`}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 rounded-2xl border border-slate-500/40 bg-slate-900/30 px-5 py-4 text-sm text-slate-300">
        {locale === "en"
          ? "Choose a mission zone above to open a dedicated page for that level."
          : "請先選擇上方任務區，系統會跳轉到對應等級的任務頁面。"}
      </div>
    </section>
  );
}
