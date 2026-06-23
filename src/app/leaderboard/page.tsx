import Image from "next/image";
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
      <div className="relative mt-10 overflow-hidden rounded-3xl border border-amber-300/25 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-[#171229]/90 px-8 py-6 shadow-lg shadow-slate-950/35">
        {/* Decorative glow blobs */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-36 w-36 rounded-full bg-amber-300/10 blur-2xl" />

        <div className="relative flex flex-wrap items-center gap-6">
          {/* Icon */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-orange-400 text-2xl text-slate-950 shadow-md shadow-amber-500/30">
            🏆
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-200/90">
              {locale === "en" ? "Monthly Exclusive" : "月度專屬獎勵"}
            </p>
            <p className="mt-1 text-lg font-bold text-white">
              {locale === "en" ? "Top Creator Bonus Reward" : "本月第一名額外獎勵"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-200/90">
              {locale === "en"
                ? "The #1 ranked creator by Coins earned this month receives a luxury watch."
                : "本月金幣收益排名第一的創作者，將額外獲得名錶獎勵。"}
            </p>
          </div>

          {/* Reward pill */}
          <div className="shrink-0 rounded-2xl border border-amber-300/30 bg-slate-900/70 px-6 py-4 text-center backdrop-blur-sm">
            <Image
              src="/watch.jpeg"
              alt={locale === "en" ? "Luxury watch reward" : "名錶獎勵"}
              width={44}
              height={44}
              className="mx-auto h-11 w-11 rounded-lg object-cover"
            />
            <p className="mt-1 text-xs font-semibold tracking-wide text-amber-200">
              {locale === "en" ? "Luxury Watch" : "名錶"}
            </p>
          </div>
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
