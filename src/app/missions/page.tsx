import { MissionCard } from "@/components/mission-card";
import { getMissionCenterData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

const zhMissionIntro = "揀返最適合你嘅受眾同內容風格任務。所有任務以 Reels Like 排名派彩：第 1 名 HK$600、第 2 名 HK$300、第 3 名 HK$100。";

export default async function MissionsPage() {
  const locale = await getCurrentLocale();
  const missionCatalog = await getMissionCenterData();
  const userLevel = missionCatalog.userLevel ?? 1;

  return (
    <section className="section-shell py-10 sm:py-12">
      <div className="max-w-4xl">
        <p className="text-sm uppercase tracking-[0.28em] text-blue-600">{locale === "en" ? "Campaign Marketplace" : "任務市集"}</p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-900">{locale === "en" ? "Mission Center" : "任務中心"}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          {locale === "en"
            ? "Pick campaigns that fit your audience and content style. Rewards are based on Reel likes ranking: #1 HK$600, #2 HK$300, #3 HK$100."
            : zhMissionIntro}
        </p>
        <div className="mt-5 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
          {locale === "en"
            ? `Your level: Lv.${userLevel} (${userLevel === 1 ? "Easy missions only" : userLevel === 2 ? "Easy + Medium missions" : "All missions unlocked"})`
            : `你目前等級：Lv.${userLevel}（${userLevel === 1 ? "只可接 Easy 任務" : userLevel === 2 ? "可接 Easy + Medium 任務" : "已解鎖全部任務"}）`}
        </div>
      </div>

      <div className="mt-8 grid auto-rows-fr gap-6 lg:grid-cols-3">
        {missionCatalog.missions.map((mission) => (
          <MissionCard key={mission.slug} mission={mission} locale={locale} userLevel={userLevel} />
        ))}
      </div>
    </section>
  );
}
