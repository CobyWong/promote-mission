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
      desc: "Creators accept missions, publish Instagram Reels, submit proof, and redeem rewards after approval.",
      primaryCta: "Browse Missions",
      secondaryCta: "Learn How It Works",
    }
    : {
      badge: "創作者任務平台",
      title: "Mission One 係一個俾創作者完成品牌內容任務並獲得獎勵嘅平台。",
      desc: "創作者可以接任務、發佈 Instagram Reels、提交 proof，審核後換取獎賞。",
      primaryCta: "瀏覽任務",
      secondaryCta: "了解流程",
    };

  return (
    <section className="section-shell py-16 sm:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
          {t.badge}
        </span>

        <h1 className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-6xl">
          {t.title}
        </h1>

        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300">
          {t.desc}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/missions" className="rounded-full bg-cyan-400 px-6 py-3 text-center font-semibold text-slate-950 transition hover:bg-cyan-300">
            {t.primaryCta}
          </Link>
          <Link href="/support" className="rounded-full border border-white/15 px-6 py-3 text-center font-semibold text-white transition hover:border-white/30 hover:bg-white/5">
            {t.secondaryCta}
          </Link>
        </div>
      </div>
    </section>
  );
}
