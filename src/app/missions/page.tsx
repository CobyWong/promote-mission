import { MissionCard } from "@/components/mission-card";
import { getMissionCenterData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

const zhMissionIntro = "喺任務關卡揀選最啱你風格嘅挑戰。每個關卡都寫明目標、拍攝提示同可獲金幣獎勵。";

export default async function MissionsPage() {
  const locale = await getCurrentLocale();
  const missionCatalog = await getMissionCenterData();

  return (
    <section className="section-shell py-10 sm:py-12">
      <div className="max-w-4xl">
        <p className="text-sm uppercase tracking-[0.28em] text-blue-600">{locale === "en" ? "Player Quest Board" : "玩家任務關卡"}</p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-900">{locale === "en" ? "Choose your next quest" : "揀你下一個關卡"}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          {locale === "en"
            ? "Pick quests that match your content build. Each quest includes clear objectives, hook ideas, and Coin rewards."
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
