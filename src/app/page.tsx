import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentViewer } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";

export default async function Home() {
  const viewer = await getCurrentViewer();

  if (viewer.user) {
    redirect("/dashboard");
  }

  const locale = await getCurrentLocale();
  const t = locale === "en"
    ? {
      badge: "Creator mission platform",
      title: "Mission One helps creators earn rewards by completing brand content tasks.",
      desc: "Creators accept missions, publish Instagram Reels with @missionone_hk collaborator, sync Instagram, and redeem rewards after approval.",
      primaryCta: "Browse Missions",
      secondaryCta: "Get Support",
      overviewTitle: "What this website does",
      overviewItems: [
        {
          title: "Mission marketplace",
          desc: "Creators can discover available campaigns and pick tasks that fit their content style.",
        },
        {
          title: "Sync-based review",
          desc: "Each submission is auto-created from synced Instagram collaborator reels for consistent reward review.",
        },
        {
          title: "Reward redemption",
          desc: "Approved performance unlocks coin rewards that can be exchanged in the rewards center.",
        },
      ],
      flowTitle: "How it works",
      flowSteps: [
        "Accept a mission that matches your niche.",
        "Publish content, add @missionone_hk as collaborator, and sync Instagram.",
        "After approval, receive coins and redeem rewards.",
      ],
      benefitsTitle: "Built for both sides",
      creatorBenefitsTitle: "For creators",
      creatorBenefits: [
        "Clear mission requirements",
        "Transparent review status",
        "Simple reward redemption flow",
      ],
      brandBenefitsTitle: "For brands",
      brandBenefits: [
        "Structured creator submissions",
        "Centralized review operations",
        "Consistent campaign execution",
      ],
    }
    : {
      badge: "創作者任務平台",
      title: "Mission One 為創作者提供品牌內容任務媒合、審核與獎勵兌換的一站式平台。",
      desc: "創作者可於本平台接受任務、發佈 Instagram Reels 並將 @missionone_hk 設為協作者，完成同步後進入審核。",
      primaryCta: "瀏覽任務",
      secondaryCta: "聯絡支援",
      overviewTitle: "平台核心功能",
      overviewItems: [
        {
          title: "任務平台",
          desc: "創作者可依內容定位選擇合適的品牌任務，並依規範有序執行。",
        },
        {
          title: "同步審核",
          desc: "每次提交由 Instagram 同步資料自動建立，確保流程透明且派發標準一致。",
        },
        {
          title: "獎勵兌換",
          desc: "任務通過後可獲得 Coins，並於獎賞中心完成兌換流程。",
        },
      ],
      flowTitle: "流程簡介",
      flowSteps: [
        "選擇符合內容定位之任務，並確認任務要求與交付規範。",
        "發佈 Instagram Reels 後，將 @missionone_hk 設為協作者並完成 Instagram 同步。",
        "經審核通過後獲得 Coins，並可進一步兌換平台獎賞。",
      ],
      benefitsTitle: "兼顧雙方營運需求",
      creatorBenefitsTitle: "創作者價值",
      creatorBenefits: [
        "任務要求明確",
        "審核進度透明",
        "獎勵機制清晰",
      ],
      brandBenefitsTitle: "品牌方價值",
      brandBenefits: [
        "提交資料結構化",
        "審核流程集中管理",
        "活動執行品質一致",
      ],
    };

  return (
    <div className="pb-20">
      <section className="section-shell py-16 sm:py-24">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white/95 px-6 py-12 text-center shadow-[0_24px_52px_rgba(15,23,42,0.09)] sm:px-10 sm:py-16">
          <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-12 h-56 w-56 rounded-full bg-orange-400/15 blur-3xl" />

          <span className="inline-flex rounded-full border border-cyan-500/35 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-700">
            {t.badge}
          </span>

          <h1 className="mt-6 text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
            {t.title}
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            {t.desc}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/missions" className="rounded-full bg-cyan-500 px-6 py-3 text-center font-semibold text-white transition hover:bg-cyan-600">
              {t.primaryCta}
            </Link>
            <Link href="/support" className="rounded-full border border-slate-300 px-6 py-3 text-center font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
              {t.secondaryCta}
            </Link>
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="glass-panel p-5 sm:p-8">
          <h2 className="text-2xl font-semibold text-slate-900">{t.overviewTitle}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {t.overviewItems.map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell mt-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-panel p-5 sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-900">{t.flowTitle}</h2>
            <div className="mt-6 space-y-3">
              {t.flowSteps.map((step, index) => (
                <div key={step} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-sm font-semibold text-cyan-700">
                    {index + 1}
                  </span>
                  <p className="text-slate-700">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-5 sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-900">{t.benefitsTitle}</h2>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-base font-semibold text-cyan-700">{t.creatorBenefitsTitle}</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {t.creatorBenefits.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-base font-semibold text-cyan-700">{t.brandBenefitsTitle}</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {t.brandBenefits.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
