"use client";

import { useMemo, useState } from "react";

import type { Submission, SubmissionStatus } from "@/lib/data";
import type { Locale } from "@/lib/i18n";

type AdminReviewBoardProps = {
  initialSubmissions: Submission[];
  locale: Locale;
};

function badgeClassName(status: SubmissionStatus) {
  if (status === "Approved") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "Needs edits") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-200";
  }

  return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
}

export function AdminReviewBoard({ initialSubmissions, locale }: AdminReviewBoardProps) {
  const t = locale === "en"
    ? {
      total: "Total submissions",
      pending: "Pending",
      edits: "Needs edits",
      approvedCoins: "Approved coins",
      submitted: "submitted",
      coins: "Coins",
      screenshots: "Screenshots",
      link: "Link",
      screenshotAlt: "submission screenshot",
      reviewerNotes: "Reviewer notes",
      saving: "saving...",
      markAs: "Mark as",
      updateFailed: "Failed to update review status.",
    }
    : {
      total: "總提交數",
      pending: "待審核",
      edits: "需修改",
      approvedCoins: "已批 Coins",
      submitted: "提交於",
      coins: "Coins",
      screenshots: "Screenshots",
      link: "連結",
      screenshotAlt: "submission screenshot",
      reviewerNotes: "Reviewer notes",
      saving: "saving...",
      markAs: "標記為",
      updateFailed: "更新審核狀態失敗。",
    };

  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    return {
      total: submissions.length,
      pending: submissions.filter((item) => item.status === "Pending").length,
      approvedCoins: submissions
        .filter((item) => item.status === "Approved")
        .reduce((sum, item) => sum + item.coins, 0),
      edits: submissions.filter((item) => item.status === "Needs edits").length,
    };
  }, [submissions]);

  return (
    <div className="space-y-8">
      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: t.total, value: summary.total.toString() },
          { label: t.pending, value: summary.pending.toString() },
          { label: t.edits, value: summary.edits.toString() },
          { label: t.approvedCoins, value: summary.approvedCoins.toLocaleString() },
        ].map((item) => (
          <div key={item.label} className="glass-panel p-5">
            <p className="text-sm text-slate-400">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6">
        {submissions.map((submission) => (
          <article key={submission.id} className="glass-panel p-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{submission.id}</p>
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${badgeClassName(submission.status)}`}>
                    {submission.status}
                  </span>
                  {savingId === submission.id ? <span className="text-xs text-slate-400">{t.saving}</span> : null}
                </div>
                <h2 className="mt-3 text-xl font-semibold text-white">{submission.missionTitle}</h2>
                <p className="mt-3 text-slate-300">
                  {submission.creatorName} · {submission.platform} · {t.submitted} {submission.submittedAt}
                </p>
                <div className="mt-5 grid gap-3 md:grid-cols-3 text-sm text-slate-300">
                  <div className="rounded-2xl bg-white/5 px-4 py-3">{t.coins}: {submission.coins}</div>
                  <div className="rounded-2xl bg-white/5 px-4 py-3">{t.screenshots}: {submission.screenshotCount}</div>
                  <div className="rounded-2xl bg-white/5 px-4 py-3">{t.link}: {submission.reelUrl}</div>
                </div>

                {submission.screenshotSignedUrls && submission.screenshotSignedUrls.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {submission.screenshotSignedUrls.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={t.screenshotAlt} className="h-28 w-full object-cover transition hover:scale-105" />
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="w-full max-w-xl rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                <p className="font-semibold text-white">{t.reviewerNotes}</p>
                <textarea
                  value={submission.notes}
                  onChange={(event) => {
                    setError(null);
                    setSubmissions((current) =>
                      current.map((item) =>
                        item.id === submission.id ? { ...item, notes: event.target.value } : item,
                      ),
                    );
                  }}
                  className="mt-4 min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
                />
                <div className="mt-4 flex flex-wrap gap-3">
                  {(["Pending", "Needs edits", "Approved"] as SubmissionStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={async () => {
                        const previousSubmissions = submissions;
                        setError(null);
                        setSavingId(submission.id);
                        setSubmissions((current) =>
                          current.map((item) => (item.id === submission.id ? { ...item, status } : item)),
                        );

                        const response = await fetch(`/api/admin/submissions/${submission.id}`, {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            status,
                            notes: submission.notes,
                          }),
                        });

                        if (!response.ok) {
                          const result = (await response.json()) as { error?: string };
                          setSubmissions(previousSubmissions);
                          setError(result.error ?? t.updateFailed);
                        }

                        setSavingId(null);
                      }}
                      className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                    >
                      {t.markAs} {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
