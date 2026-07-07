import Link from "next/link";

import { getAllGamePassLevelRewards } from "@/lib/game-pass";
import { getCurrentLocale } from "@/lib/i18n";

export default async function LevelRewardsPage() {
  const locale = await getCurrentLocale();
  const rewards = getAllGamePassLevelRewards();

  const t = locale === "en"
    ? {
      kicker: "Game Pass",
      title: "Level Rewards Table",
      lead: "See exactly how many bonus Coins you earn at each level-up from Lv.1 to Lv.30.",
      backDashboard: "Back to dashboard",
      level: "Level",
      reward: "Level-up reward",
      note: "Milestone bonus (+250 Coins) is applied at every 5 levels.",
      milestone: "Milestone bonus",
    }
    : {
      kicker: "Game Pass",
      title: "等級獎勵表",
      lead: "清楚列出 Lv.1 到 Lv.30 每次升級可獲得嘅 Coins 獎勵。",
      backDashboard: "返回個人檔案",
      level: "等級",
      reward: "升級獎勵",
      note: "每逢 5 級會有里程碑加成（+250 Coins）。",
      milestone: "里程碑加成",
    };

  return (
    <section className="section-shell py-12 sm:py-16">
      <Link href="/dashboard" className="text-sm font-semibold text-cyan-300">
        ← {t.backDashboard}
      </Link>

      <div className="mt-5 max-w-4xl">
        <p className="tactical-section-kicker">{t.kicker}</p>
        <h1 className="tactical-section-title">{t.title}</h1>
        <p className="tactical-section-lead">{t.lead}</p>
      </div>

      <div className="tactical-card mt-8 overflow-hidden p-0">
        <div className="grid grid-cols-[0.5fr_1fr_1fr] border-b border-white/10 bg-slate-900/70 px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          <p>{t.level}</p>
          <p>{t.reward}</p>
          <p>{t.milestone}</p>
        </div>

        <div className="divide-y divide-white/10">
          {rewards.map((item) => {
            const isMilestone = item.level % 5 === 0;
            return (
              <div key={item.level} className="grid grid-cols-[0.5fr_1fr_1fr] items-center px-5 py-4 text-sm">
                <p className="font-semibold text-slate-100">Lv.{item.level}</p>
                <p className="font-semibold text-amber-200">+{item.coins.toLocaleString()} Coins</p>
                <p className={isMilestone ? "text-emerald-300" : "text-slate-500"}>
                  {isMilestone ? "+250" : "-"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
        {t.note}
      </div>
    </section>
  );
}
