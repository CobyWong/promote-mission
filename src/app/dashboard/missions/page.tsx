import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardMissionActions } from "@/components/dashboard-mission-actions";
import { getDashboardData } from "@/lib/backend";
import { getCurrentLocale } from "@/lib/i18n";
import { getMissionTotalPrizeByDifficulty } from "@/lib/mission-rules";

export default async function DashboardMissionsPage() {
  const locale = await getCurrentLocale();
  const dashboard = await getDashboardData();

  if (dashboard.mode === "unauthenticated") {
    redirect("/login?next=/dashboard/missions");
  }

  if (dashboard.mode !== "live") {
    redirect("/dashboard");
  }

  const t = locale === "en"
    ? {
      title: "Active Missions",
      back: "Back",
      pendingReviews: "Pending reviews",
      due: "Due",
      reward: "Reward",
      viewBrief: "View brief",
      empty: "You don't have active missions yet. Browse missions to start.",
      browse: "Browse missions",
      approved: "Approved",
      pending: "Pending",
      needsEdits: "Needs edits",
    }
    : {
      title: "進行中任務",
      back: "返回",
      pendingReviews: "待審核",
      due: "截止",
      reward: "獎勵",
      viewBrief: "查看詳情",
      empty: "目前尚未有進行中任務，先去任務中心接取任務。",
      browse: "瀏覽任務",
      approved: "已批准",
      pending: "待審核",
      needsEdits: "需修改",
    };

  const statusLabel = (status?: string) => {
    if (!status || locale === "en") return status;
    if (status === "Approved") return t.approved;
    if (status === "Pending") return t.pending;
    if (status === "Needs edits") return t.needsEdits;
    return status;
  };

  return (
    <section className="section-shell py-12 sm:py-16">
      <Link href="/dashboard" className="text-sm font-semibold text-cyan-300">← {t.back}</Link>

      <div className="tactical-card mt-6 p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold text-slate-100">{t.title}</h1>
          <p className="text-sm text-slate-300">{t.pendingReviews}: {dashboard.pendingCount}</p>
        </div>

        {dashboard.activeMissions.length === 0 ? (
          <div className="mt-8 text-sm text-slate-300">
            <p>{t.empty}</p>
            <Link href="/missions" className="tactical-btn-primary mt-5 px-5 py-3">{t.browse}</Link>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {dashboard.activeMissions.map((mission) => {
              const totalPrize = getMissionTotalPrizeByDifficulty(mission.difficulty);
              const submissionStatus = dashboard.missionStatusMap?.get(mission.slug);
              return (
                <div key={mission.slug} className="border-t border-white/10 pt-4 first:border-t-0 first:pt-0">
                  <p className="text-sm text-amber-200">{mission.brand}</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-100">{mission.title}</h2>
                  <p className="mt-2 text-sm text-slate-400">{t.due}: {mission.eta} · {t.reward}: HK${totalPrize.toLocaleString()}</p>
                  {submissionStatus ? <p className="mt-1 text-xs text-cyan-200">{statusLabel(submissionStatus)}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link href={`/missions/${mission.slug}`} className="tactical-link inline-flex min-h-11 items-center text-sm font-semibold">
                      {t.viewBrief} ›
                    </Link>
                    <DashboardMissionActions missionSlug={mission.slug} locale={locale} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
