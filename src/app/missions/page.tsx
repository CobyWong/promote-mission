import { MissionCard } from "@/components/mission-card";
import { getMissionCenterData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

const zhMissionIntro = "揀返最適合你嘅受眾同內容風格任務。每個任務都列明交稿要求、內容切入建議同可獲金幣。";

export default async function MissionsPage() {
  const locale = await getCurrentLocale();
  const missionCatalog = await getMissionCenterData();

  return (
    <section className="section-shell py-10 sm:py-12">
      <div className="max-w-4xl">
        <p className="text-sm uppercase tracking-[0.28em] text-blue-600">{locale === "en" ? "Campaign Marketplace" : "任務市集"}</p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-900">{locale === "en" ? "Mission Center" : "任務中心"}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          {locale === "en"
            ? "Pick campaigns that fit your audience and content style. Every mission includes clear deliverables, hook ideas, and coin rewards."
            : zhMissionIntro}
        </p>
      </div>

      <div className="mt-8 grid auto-rows-fr gap-6 lg:grid-cols-3">
        {missionCatalog.missions.map((mission) => (
          <MissionCard key={mission.slug} mission={mission} locale={locale} />
        ))}
      </div>
    </section>
  );
}
