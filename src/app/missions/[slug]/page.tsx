import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";

import { MissionAcceptCard } from "@/components/mission-accept-card";
import { getMissionBySlug } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";
import { getMissionImage } from "@/lib/mission-media";

export default async function MissionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const locale = await getCurrentLocale();
  const { slug } = await params;
  const mission = await getMissionBySlug(slug);

  if (!mission) {
    notFound();
  }

  const missionImage = getMissionImage(mission.slug);

  return (
    <section className="section-shell py-12 sm:py-16">
      <Link href="/missions" className="text-sm font-semibold text-cyan-300">
        {locale === "en" ? "← Back to missions" : "← 返回任務中心"}
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="glass-panel p-8">
          <div className="relative -mx-4 -mt-4 mb-7 h-64 overflow-hidden rounded-3xl border border-white/10 sm:-mx-2">
            <Image
              src={missionImage}
              alt={mission.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/20 to-transparent" />
          </div>

          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{mission.brand}</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">{mission.title}</h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">{mission.description}</p>

          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-200">
            {mission.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white/5 px-4 py-2">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-white/5 p-5">
              <p className="text-sm text-slate-400">{locale === "en" ? "Reward" : "獎勵"}</p>
              <p className="mt-2 text-2xl font-semibold text-cyan-300">{mission.points} Coins</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-5">
              <p className="text-sm text-slate-400">{locale === "en" ? "Difficulty" : "難度"}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{mission.difficulty}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-5">
              <p className="text-sm text-slate-400">{locale === "en" ? "Deadline" : "交稿時間"}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{mission.eta}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-fuchsia-300">{locale === "en" ? "Suggested Hook" : "建議切入點"}</p>
            <p className="mt-4 text-2xl font-semibold leading-9 text-white">{mission.hook}</p>
          </div>

          <div className="glass-panel p-8">
            <h2 className="text-2xl font-semibold text-white">{locale === "en" ? "Mission Requirements" : "任務要求"}</h2>
            <ul className="mt-5 space-y-3 text-slate-300">
              {mission.requirements.map((item) => (
                <li key={item} className="rounded-2xl bg-white/5 px-4 py-3">• {item}</li>
              ))}
            </ul>
          </div>

          <div className="glass-panel p-8">
            <h2 className="text-2xl font-semibold text-white">{locale === "en" ? "Deliverables" : "提交內容"}</h2>
            <ul className="mt-5 space-y-3 text-slate-300">
              {mission.deliverables.map((item) => (
                <li key={item} className="rounded-2xl bg-white/5 px-4 py-3">• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="glass-panel p-8">
          <h2 className="text-2xl font-semibold text-white">{locale === "en" ? "Submission Steps" : "交稿流程"}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {(locale === "en"
              ? ["Film & publish your IG Reels publicly", "Upload the video link & a screenshot", "Receive Coins after review approval"]
              : ["拍攝並公開發佈 IG Reels", "上傳影片連結與發佈截圖", "待審核後收 Coins 入帳"]
            ).map((step, index) => (
              <div key={step} className="rounded-2xl bg-white/5 p-5">
                <p className="text-sm text-cyan-300">Step {index + 1}</p>
                <p className="mt-3 text-white">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <MissionAcceptCard
          missionSlug={mission.slug}
          eta={mission.eta}
          locale={locale}
          minParticipants={mission.minParticipants}
          currentParticipants={mission.currentParticipants}
        />
      </div>
    </section>
  );
}
