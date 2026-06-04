import { getCurrentLocale } from "@/lib/i18n";
import { LeaderboardClient } from "@/components/leaderboard-client";
import { getLeaderboardData } from "@/lib/backend";

export default async function LeaderboardPage() {
  const locale = await getCurrentLocale();
  const data = await getLeaderboardData();

  return (
    <section className="section-shell py-12 sm:py-16">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
          {locale === "en" ? "Rankings" : "排行榜"}
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-white">
          {locale === "en" ? "Creator Leaderboard" : "創作者排行榜"}
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-300">
          {locale === "en"
            ? "Top creators ranked by Coins earned this month. Complete missions to climb the ranks."
            : "本月金幣收益最高的創作者排名。完成任務即可提升排名，贏取額外獎勵。"}
        </p>
      </div>

      {/* Monthly reward banner */}
      <div className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-6 py-4">
        <span className="text-3xl">🏆</span>
        <div>
          <p className="font-semibold text-amber-200">
            {locale === "en" ? "Monthly #1 Bonus Reward" : "月度第一名額外獎勵"}
          </p>
          <p className="mt-0.5 text-sm text-amber-100/80">
            {locale === "en"
              ? "The top creator by Coins earned this month wins an extra 3,000 Coins bonus!"
              : "本月金幣收益排名第一的創作者，將獲得額外 3,000 金幣獎勵！"}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-bold text-amber-300">+3,000</p>
          <p className="text-xs text-amber-100/60">{locale === "en" ? "Coins" : "金幣"}</p>
        </div>
      </div>

      <LeaderboardClient
        locale={locale}
        leaders={data.leaders}
        mode={data.mode}
      />
    </section>
  );
}
