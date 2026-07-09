import { getMissionCenterData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";
import { DIFFICULTY_REQUIRED_LEVEL, getMissionRequiredLevel } from "@/lib/mission-rules";
import Link from "next/link";

const zhMissionIntro = "請選擇最符合受眾定位與內容風格的任務。";

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
      ? "適合入門創作者的基礎任務"
      : key === "Medium"
        ? "執行要求與獎勵水準同步提升"
        : "高標準挑戰，適合進階創作者";
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
          const sharedClass = `group relative block overflow-hidden rounded-3xl border px-7 py-9 text-center transition duration-300 ${
            locked
              ? "border-slate-500/50 bg-slate-900/30"
              : "border-cyan-300/35 bg-slate-900/35 hover:-translate-y-0.5 hover:border-cyan-200/65"
          }`;
          return (
            <Link key={section.key} href={`/missions/level/${section.key.toLowerCase()}`} className={sharedClass}>
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${sectionAccent(section.key)} ${locked ? "opacity-45" : "opacity-80"}`} />
              <div className="absolute right-6 top-6 text-2xl text-cyan-200/80 transition group-hover:scale-110">{sectionIcon(section.key)}</div>
              <div className="relative mx-auto flex min-h-[150px] max-w-2xl flex-col items-center justify-center">
                <p className="text-4xl font-semibold text-slate-100 sm:text-5xl">{sectionLabel(section.key)}</p>
                <p className="mt-2 text-sm text-slate-300">{sectionSubLabel(section.key)}</p>
                {locked ? (
                  <p className="mt-4 text-sm font-semibold text-amber-200">
                    {locale === "en" ? `Preview available · Unlock missions at Lv.${section.requiredLevel}` : `可先預覽任務 · 達到 Lv.${section.requiredLevel} 後可接任務`}
                  </p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 rounded-2xl border border-slate-500/40 bg-slate-900/30 px-5 py-4 text-sm text-slate-300">
        {locale === "en"
          ? "Choose a mission zone above to open a dedicated page for that level."
          : "請先選擇上方任務分區，系統將跳轉至對應等級頁面。"}
      </div>
    </section>
  );
}
