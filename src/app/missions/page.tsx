import { MissionCard } from "@/components/mission-card";
import { getMissionCenterData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

const zhMissionIntro = "揀返最適合你嘅受眾同內容風格任務。每個任務都列明交稿要求、內容切入建議同可獲金幣。";

export default async function MissionsPage() {
  const locale = await getCurrentLocale();
  const missionCatalog = await getMissionCenterData();
  const featured = missionCatalog.missions[0];
  const topMissions = missionCatalog.missions.slice(1);

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

      <div className="mt-8 rounded-3xl bg-slate-900 px-6 py-5 text-white shadow-sm">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-300">{locale === "en" ? "Campaign Budget" : "Campaign 獎勵池"}</p>
        <p className="mt-2 text-4xl font-semibold">HK$220,000.00</p>
      </div>

      {featured ? (
        <article className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="relative h-64 bg-slate-100 md:h-80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={featured.imageUrl ?? "/missions/default-mission.svg"}
              alt={featured.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/30 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <p className="text-sm font-medium text-slate-200">{featured.brand}</p>
              <h2 className="mt-1 text-2xl font-semibold text-white md:text-3xl">{featured.title}</h2>
              <p className="mt-2 text-sm text-slate-200">{locale === "en" ? "Per campaign reward" : "每個任務獎勵"}: HK${featured.points.toLocaleString()}</p>
            </div>
          </div>
        </article>
      ) : null}

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        <span>{locale === "en" ? "Trending campaigns are updating in real time." : "熱門任務即時更新中。"}</span>
        <button type="button" className="rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold">
          {locale === "en" ? "Refresh" : "立即刷新"}
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {[locale === "en" ? "All categories" : "所有類型", locale === "en" ? "Any budget" : "任何預算", locale === "en" ? "Any deadline" : "任何時限", locale === "en" ? "Sort: Trending" : "排序：熱門"].map((chip) => (
            <span key={chip} className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{chip}</span>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {topMissions.map((mission) => (
          <MissionCard key={mission.slug} mission={mission} locale={locale} />
        ))}
      </div>
    </section>
  );
}
