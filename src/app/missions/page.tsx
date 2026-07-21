import { getMissionCenterData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";
import { DIFFICULTY_REQUIRED_LEVEL, getMissionRequiredLevel } from "@/lib/mission-rules";
import Link from "next/link";

export default async function MissionsPage() {
  const locale = await getCurrentLocale();
  const missionCatalog = await getMissionCenterData();
  const userLevel = missionCatalog.userLevel ?? 1;
  const dateLocale = locale === "en" ? "en-US" : "zh-HK";
  const numberFormat = new Intl.NumberFormat(dateLocale);

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
        ? "Quick-start tasks with lower barrier"
        : key === "Medium"
          ? "Structured campaign missions with stronger rewards"
          : "Advanced challenges for experienced creators";
    }

    return key === "Easy"
      ? "適合入門創作者，門檻較低"
      : key === "Medium"
        ? "要求與獎勵同步提升的任務"
        : "高強度挑戰，適合進階創作者";
  };

  const sectionTone = (key: "Easy" | "Medium" | "Hard") => {
    if (key === "Easy") {
      return {
        chip: "bg-cyan-100 text-cyan-800 border-cyan-300/60",
        strip: "from-cyan-300 via-sky-300 to-cyan-200",
      };
    }
    if (key === "Medium") {
      return {
        chip: "bg-indigo-100 text-indigo-800 border-indigo-300/60",
        strip: "from-indigo-300 via-sky-300 to-cyan-200",
      };
    }
    return {
      chip: "bg-orange-100 text-orange-800 border-orange-300/60",
      strip: "from-orange-300 via-amber-300 to-yellow-200",
    };
  };

  const formatEndsAt = (endsAt?: string | null) => {
    if (!endsAt) {
      return locale === "en" ? "No fixed deadline" : "暫無固定截止日";
    }

    const parsed = new Date(endsAt);
    if (Number.isNaN(parsed.getTime())) {
      return locale === "en" ? "No fixed deadline" : "暫無固定截止日";
    }

    return new Intl.DateTimeFormat(dateLocale, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(parsed);
  };

  return (
    <section className="section-shell py-10 sm:py-12">
      <div className="max-w-4xl">
        <p className="tactical-section-kicker">{locale === "en" ? "Campaign Marketplace" : "任務市集"}</p>
        <h1 className="tactical-section-title">{locale === "en" ? "Mission Center" : "任務中心"}</h1>
        <p className="mt-4 text-base text-slate-700 sm:text-lg">
          {locale === "en"
            ? "Browse available missions and join campaigns that fit your current level."
            : "瀏覽可參與任務，按目前等級挑選最適合的活動。"}
        </p>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-200 bg-white/85 p-4 shadow-[0_14px_30px_rgba(15,23,42,0.08)] sm:p-5">
        <p className="text-sm font-semibold text-slate-700">
          {locale === "en" ? "Current creator level" : "目前創作者等級"}
        </p>
        <p className="mt-1 text-2xl font-bold text-cyan-700">Lv.{userLevel}</p>
      </div>

      <div className="mt-8 space-y-10">
        {levelSections.map((section) => {
          const locked = userLevel < section.requiredLevel;
          const tone = sectionTone(section.key);

          return (
            <div key={section.key}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{sectionLabel(section.key)}</h2>
                  <p className="mt-1 text-sm text-slate-600">{sectionSubLabel(section.key)}</p>
                </div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tone.chip}`}>
                  {locale === "en" ? `Unlock Lv.${section.requiredLevel}` : `Lv.${section.requiredLevel} 解鎖`}
                </span>
              </div>

              {section.missions.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-5 text-sm text-slate-600">
                  {locale === "en" ? "No missions in this zone yet." : "此分區暫無任務。"}
                </div>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {section.missions.map((mission) => {
                    const missionLocked = userLevel < getMissionRequiredLevel(mission.difficulty);
                    const initial = mission.brand.trim().charAt(0).toUpperCase() || "M";
                    return (
                      <article
                        key={mission.slug}
                        className={`overflow-hidden rounded-3xl border bg-white shadow-[0_12px_26px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 ${
                          missionLocked ? "border-amber-300/60" : "border-slate-200"
                        }`}
                      >
                        <div className={`relative h-28 bg-gradient-to-r ${tone.strip}`}>
                          <div className="absolute right-4 top-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/60 bg-white/35 text-lg font-bold text-slate-800">
                            {initial}
                          </div>
                          <div className="absolute bottom-3 left-4 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700">
                            {mission.category}
                          </div>
                        </div>

                        <div className="space-y-3 p-4">
                          <h3 className="line-clamp-2 text-xl font-bold text-slate-900">{mission.title}</h3>
                          <p className="line-clamp-2 text-sm text-slate-600">{mission.description}</p>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                              {locale === "en" ? "Mission reward" : "任務獎勵"}
                            </p>
                            <p className="mt-1 text-2xl font-extrabold text-orange-600">
                              {numberFormat.format(mission.points)} {locale === "en" ? "Coins" : "金幣"}
                            </p>
                          </div>

                          <div className="space-y-1 text-sm text-slate-600">
                            <p>
                              {locale === "en" ? "Difficulty" : "難度"}: <span className="font-semibold text-slate-800">{mission.difficulty}</span>
                            </p>
                            <p>
                              {locale === "en" ? "Ends" : "截止日"}: <span className="font-semibold text-slate-800">{formatEndsAt(mission.endsAt)}</span>
                            </p>
                            {(mission.minParticipants ?? 0) > 0 ? (
                              <p>
                                {locale === "en" ? "Creators" : "創作者"}: <span className="font-semibold text-slate-800">{mission.currentParticipants ?? 0} / {mission.minParticipants}</span>
                              </p>
                            ) : null}
                          </div>

                          {missionLocked ? (
                            <p className="rounded-xl border border-amber-300/60 bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800">
                              {locale === "en"
                                ? `Preview only. Unlock at Lv.${getMissionRequiredLevel(mission.difficulty)}.`
                                : `目前可預覽，達 Lv.${getMissionRequiredLevel(mission.difficulty)} 後可接任務。`}
                            </p>
                          ) : null}

                          <Link
                            href={`/missions/${mission.slug}`}
                            className={`flex h-11 w-full items-center justify-center rounded-xl border px-4 text-sm font-semibold transition ${
                              missionLocked
                                ? "border-amber-300/60 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                : "border-cyan-500 bg-cyan-500 text-white hover:bg-cyan-600"
                            }`}
                          >
                            {missionLocked
                              ? (locale === "en" ? "Preview mission" : "預覽任務")
                              : (locale === "en" ? "View mission" : "查看任務")}
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {locked ? (
                <p className="mt-3 text-sm font-semibold text-amber-700">
                  {locale === "en"
                    ? `This zone unlocks at Lv.${section.requiredLevel}.`
                    : `此分區需達 Lv.${section.requiredLevel} 才可正式接任務。`}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
