import Link from "next/link";

import { getAllGamePassLevelRewards } from "@/lib/game-pass";
import { getCurrentLocale } from "@/lib/i18n";

export default async function LevelRewardsPage() {
  const locale = await getCurrentLocale();
  const rewards = getAllGamePassLevelRewards();

  const t = locale === "en"
    ? {
      kicker: "Game Pass",
      title: "Free Pass Reward Track",
      lead: "Free Pass only. Scroll horizontally to preview every level reward from Lv.1 to Lv.30.",
      backDashboard: "Back to dashboard",
      level: "Level",
      reward: "Reward",
      note: "Milestone levels (every 5 levels) include an extra +250 Coins bonus.",
      swipeHint: "Swipe to view more levels",
    }
    : {
      kicker: "",
      title: "等級獎勵表",
      lead: "",
      backDashboard: "返回個人檔案",
      level: "等級",
      reward: "獎勵",
      note: "每逢 5 級里程碑均包含額外 +250 Coins 獎勵。",
      swipeHint: "請左右滑動以查看更多等級",
    };

  return (
    <section className="section-shell py-12 sm:py-16">
      <Link href="/dashboard" className="text-sm font-semibold text-cyan-300">
        ← {t.backDashboard}
      </Link>

      <div className="mt-5 max-w-4xl">
        {t.kicker ? <p className="tactical-section-kicker">{t.kicker}</p> : null}
        <h1 className="tactical-section-title">{t.title}</h1>
        {t.lead ? <p className="tactical-section-lead">{t.lead}</p> : null}
      </div>

      <div className="tactical-card mt-8 overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-900/70 px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{t.swipeHint}</p>
        </div>

        <div className="overflow-x-auto px-4 py-8 sm:px-6">
          <div className="relative min-w-[2200px] sm:min-w-[4200px]">
            <div className="pointer-events-none absolute left-0 right-0 top-[7.1rem] h-1 rounded-full bg-slate-700/70" />

            <div className="relative flex gap-3">
              {rewards.map((item) => {
                const isMilestone = item.level % 5 === 0;
                return (
                  <article
                    key={item.level}
                    className={`w-32 shrink-0 rounded-2xl border p-3 ${isMilestone
                      ? "border-amber-300/60 bg-amber-300/15"
                      : "border-cyan-300/35 bg-cyan-300/10"
                      }`}
                  >
                    <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg ${isMilestone
                      ? "bg-amber-300/25 text-amber-100"
                      : "bg-cyan-300/20 text-cyan-100"
                      }`}>
                      ◎
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-slate-300">{t.reward}</p>
                    <p className="mt-1 text-base font-black text-white">+{item.coins.toLocaleString()}</p>
                    <p className="mt-2 text-[11px] text-slate-300">Coins</p>
                  </article>
                );
              })}
            </div>

            <div className="relative mt-4 flex gap-3">
              {rewards.map((item) => (
                <div key={`lv-${item.level}`} className="w-32 shrink-0 text-center">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-500 bg-slate-800 text-xs font-bold text-slate-200">
                    {item.level}
                  </span>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">{t.level}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">
        {t.note}
      </div>
    </section>
  );
}
