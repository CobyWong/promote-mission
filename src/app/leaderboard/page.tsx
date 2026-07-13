import Image from "next/image";
import { getCurrentLocale } from "@/lib/i18n";
import { LeaderboardClient } from "@/components/leaderboard-client";
import { getLeaderboardData } from "@/lib/backend";

const MONTHLY_REWARD_MIN_LIKES = 200_000;

export default async function LeaderboardPage() {
  const locale = await getCurrentLocale();
  const data = await getLeaderboardData();
  const topCreator = data.leaders[0] ?? null;
  const topCreatorLikes = topCreator?.totalLikes ?? 0;
  const isRewardEligible = topCreatorLikes >= MONTHLY_REWARD_MIN_LIKES;
  const numberFormat = new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-HK");

  const bannerClass = "border-amber-300/25 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-[#171229]/90 shadow-lg shadow-slate-950/35";

  const glowTopClass = "bg-cyan-300/10";
  const glowBottomClass = "bg-amber-300/10";

  const iconClass = "bg-gradient-to-br from-amber-300 via-amber-400 to-orange-400 text-slate-950";

  const titleTagClass = "text-amber-200/90";
  const headingClass = "text-white";
  const descClass = "text-slate-200/90";

  const rewardPillClass = "border-amber-300/30 bg-slate-900/75";
  const rewardLabelClass = "text-amber-100";
  const gateBaseClass = "mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-wide";
  const gateOkClass = "border-emerald-300/40 bg-emerald-400/15 text-emerald-200";
  const gateLockedClass = "border-rose-300/35 bg-rose-400/10 text-rose-200";

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
            ? "Top creators ranked by total Likes this month. Complete missions to climb the ranks."
            : "本月以總 Like 數排名創作者。完成任務即可提升排名，贏取額外獎勵。"}
        </p>
      </div>

      {/* Monthly reward banner */}
      <div className={`relative mt-10 overflow-hidden rounded-3xl border px-4 py-5 sm:px-8 sm:py-6 ${bannerClass}`}>
        {/* Decorative glow blobs */}
        <div className={`pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full blur-3xl ${glowTopClass}`} />
        <div className={`pointer-events-none absolute -bottom-10 left-1/3 h-36 w-36 rounded-full blur-2xl ${glowBottomClass}`} />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
          {/* Icon */}
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-md shadow-amber-500/30 sm:h-14 sm:w-14 ${iconClass}`}>
            🏆
          </div>

          {/* Text */}
          <div className="w-full min-w-0 sm:flex-1">
            <p className={`text-xs font-semibold uppercase tracking-widest ${titleTagClass}`}>
              {locale === "en" ? "Monthly Exclusive" : "月度專屬獎勵"}
            </p>
            <p className={`mt-1 text-lg font-bold ${headingClass}`}>
              {locale === "en" ? "Top Creator Bonus Reward" : "本月第一名額外獎勵"}
            </p>
            <p className={`mt-1 text-sm leading-relaxed ${descClass}`}>
              {locale === "en"
                ? "The #1 ranked creator by total likes this month receives a luxury watch only when total likes reach 200,000 or above."
                : "本月總 Like 數排名第一的創作者，只有在總 Like 數達到 200,000 或以上時，方可獲得名錶獎勵。"}
            </p>
            <p className="mt-2 text-xs text-slate-300/90">
              {locale === "en"
                ? `Current #1 total likes: ${numberFormat.format(topCreatorLikes)} / ${numberFormat.format(MONTHLY_REWARD_MIN_LIKES)}`
                : `目前第一名總 Like：${numberFormat.format(topCreatorLikes)} / ${numberFormat.format(MONTHLY_REWARD_MIN_LIKES)}`}
            </p>
            <span className={`${gateBaseClass} ${isRewardEligible ? gateOkClass : gateLockedClass}`}>
              {isRewardEligible
                ? (locale === "en" ? "Prize unlocked" : "已達獎勵門檻")
                : (locale === "en" ? "Prize locked: total likes below threshold" : "獎勵未解鎖：總 Like 未達門檻")}
            </span>
          </div>

          {/* Reward pill */}
          <div className={`w-full rounded-2xl border px-5 py-4 text-center backdrop-blur-sm sm:w-auto sm:shrink-0 sm:px-7 sm:py-5 ${rewardPillClass}`}>
            <Image
              src="/watch.jpeg"
              alt={locale === "en" ? "Luxury watch reward" : "名錶獎勵"}
              width={84}
              height={84}
              className="mx-auto h-20 w-20 rounded-xl object-cover"
            />
            <p className={`mt-2 text-lg font-extrabold tracking-wide ${rewardLabelClass}`}>
              {locale === "en" ? "Luxury Watch" : "名錶"}
            </p>
            <p className="mt-1 text-xs text-slate-300/90">
              {locale === "en" ? "Base threshold: 200,000 total likes" : "基礎門檻：總 Like 200,000"}
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
