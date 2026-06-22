import Link from "next/link";

import { MissionCard } from "@/components/mission-card";
import { RewardCard } from "@/components/reward-card";
import { getMissionCatalog, getRewardsCatalog } from "@/lib/backend";
import { leaders, perks, reelIdeas, stats } from "@/lib/data";
import { getCurrentLocale } from "@/lib/i18n";

export default async function Home() {
  const locale = await getCurrentLocale();
  const missionCatalog = await getMissionCatalog();
  const rewardCatalog = await getRewardsCatalog();
  const featuredMissions = missionCatalog.missions;
  const featuredRewards = rewardCatalog.rewards;

  return (
    <div className="pb-20">
      <section className="section-shell pt-12 sm:pt-16">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
              {locale === "en" ? "Creator mission platform for IG Reels campaigns" : "IG Reels 創作者任務平台"}
            </span>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-6xl">
              {locale === "en" ? <>Take missions, post <span className="gradient-text">Instagram Reels</span>, earn Coins and redeem rewards</> : <>接任務、拍 <span className="gradient-text">Instagram Reels</span>、賺 Coins 換真實獎賞</>}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              幫品牌宣傳 product，完成指定 Reels 任務後上傳 proof，系統審核成功就即時入 Coins，之後可以換禮券、USDT 同 gadgets。
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/missions" className="rounded-full bg-cyan-400 px-6 py-3 text-center font-semibold text-slate-950 transition hover:bg-cyan-300">
                {locale === "en" ? "Browse Missions" : "立即接任務"}
              </Link>
              <Link href="/dashboard" className="rounded-full border border-white/15 px-6 py-3 text-center font-semibold text-white transition hover:border-white/30 hover:bg-white/5">
                {locale === "en" ? "Open Dashboard" : "睇 Creator Dashboard"}
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="glass-panel p-4">
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel overflow-hidden p-6">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">今日推薦任務</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{featuredMissions[0].title}</h2>
                </div>
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">審核快</span>
              </div>

              <div className="mt-6 space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <span>品牌</span>
                  <span className="font-medium text-white">{featuredMissions[0].brand}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <span>任務獎勵</span>
                  <span className="font-medium text-cyan-300">{featuredMissions[0].points} Coins</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <span>交稿時間</span>
                  <span className="font-medium text-white">{featuredMissions[0].eta}</span>
                </div>
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-cyan-400/20 bg-cyan-400/10 p-5">
                <p className="text-sm font-medium text-cyan-200">拍片 Hook 建議</p>
                <p className="mt-2 text-lg text-white">{featuredMissions[0].hook}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell mt-20">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-panel p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Why creators stay</p>
            <h2 className="mt-4 text-3xl font-semibold text-white">簡單、透明、真實有得換</h2>
            <div className="mt-6 grid gap-3">
              {perks.map((perk) => (
                <div key={perk} className="rounded-2xl bg-white/5 px-4 py-4 text-slate-200">
                  {perk}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-fuchsia-300">How it works</p>
            <div className="mt-6 space-y-4">
              {[
                "免費註冊，完善 IG 帳號與內容類型",
                "喺任務中心揀適合自己嘅 product campaign",
                "出 Reels、公開發佈，再上傳截圖同連結",
                "審核成功後收 Coins，再去商城兌換"
              ].map((step, index) => (
                <div key={step} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fuchsia-400/20 font-semibold text-fuchsia-200">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-slate-200">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell mt-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Mission Marketplace</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">精選熱門任務</h2>
          </div>
          <Link href="/missions" className="text-sm font-semibold text-cyan-300">查看全部 →</Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {featuredMissions.slice(0, 3).map((mission) => (
            <MissionCard key={mission.slug} mission={mission} locale={locale} />
          ))}
        </div>
      </section>

      <section className="section-shell mt-20 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-300">Leaderboard</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">本月龍虎榜</h2>
          <div className="mt-5 rounded-2xl border border-amber-400/20 bg-gradient-to-r from-amber-400/10 to-rose-400/10 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">每月大獎</p>
            <p className="mt-2 text-sm text-slate-200">🥇 名錶 ・ 🥈 跑車體驗</p>
            <p className="mt-1 text-xs text-slate-400">按本月 Coins 排名派發</p>
          </div>
          <div className="mt-6 space-y-3">
            {leaders.map((leader, index) => (
              <div key={leader.name} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-4">
                <div>
                  <p className="font-medium text-white">#{index + 1} {leader.name}</p>
                  <p className="text-sm text-slate-400">{leader.platform} · {leader.followers}</p>
                </div>
                <span className="font-semibold text-cyan-300">{leader.coins.toLocaleString()} C</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Reels Inspiration</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">拍片角度靈感</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {reelIdeas.map((idea) => (
              <div key={idea.title} className="rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-5">
                <p className="text-sm text-emerald-300">{idea.angle}</p>
                <h3 className="mt-3 text-lg font-semibold text-white">{idea.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{idea.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell mt-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Rewards Shop</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Coins 可以換咩？</h2>
          </div>
          <Link href="/rewards" className="text-sm font-semibold text-cyan-300">查看商城 →</Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {featuredRewards.map((reward) => (
            <RewardCard key={reward.slug} reward={reward} locale={locale} />
          ))}
        </div>
      </section>

    </div>
  );
}
