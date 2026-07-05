"use client";

import { useMemo, useState } from "react";

import type { AdminReviewer, Submission, SubmissionStatus } from "@/lib/data";
import type { Locale } from "@/lib/i18n";

type AdminReviewBoardProps = {
  initialSubmissions: Submission[];
  initialReviewers: AdminReviewer[];
  locale: Locale;
};

type StatusFilter = "all" | SubmissionStatus;
type SlaFilter = "all" | "overdue" | "dueSoon" | "none";

type SlaState = "overdue" | "dueSoon" | "ok" | "none";

function getSlaState(submission: Submission): SlaState {
  if (!submission.reviewDueAt || submission.status === "Approved") {
    return "none";
  }

  const due = new Date(submission.reviewDueAt).getTime();
  if (Number.isNaN(due)) {
    return "none";
  }

  const now = Date.now();
  if (due < now) {
    return "overdue";
  }

  if (due - now <= 24 * 60 * 60 * 1000) {
    return "dueSoon";
  }

  return "ok";
}

function formatDateTimeLocal(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function badgeClassName(status: SubmissionStatus) {
  if (status === "Approved") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "Needs edits") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-200";
  }

  return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
}

function slaBadgeClassName(state: SlaState) {
  if (state === "overdue") {
    return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  }

  if (state === "dueSoon") {
    return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  }

  if (state === "ok") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }

  return "border-slate-400/20 bg-slate-400/10 text-slate-200";
}

export function AdminReviewBoard({ initialSubmissions, initialReviewers, locale }: AdminReviewBoardProps) {
  const t = locale === "en"
    ? {
      total: "Total submissions",
      pending: "Pending",
      edits: "Needs edits",
      approvedCoins: "Approved coins",
      selected: "Selected",
      filters: "Filters",
      statusFilter: "Status",
      reviewerFilter: "Reviewer",
      slaFilter: "SLA",
      all: "All",
      unassigned: "Unassigned",
      overdue: "Overdue",
      dueSoon: "Due in 24h",
      noDue: "No due date",
      submitted: "submitted",
      coins: "Coins",
      screenshots: "Screenshots",
      link: "Link",
      screenshotAlt: "submission screenshot",
      reviewerNotes: "Reviewer notes",
      assignedReviewer: "Assigned reviewer",
      reviewDueAt: "Review due at",
      saveAssignment: "Save assignment",
      assignFailed: "Failed to save assignment.",
      bulkActions: "Bulk actions",
      bulkApplyStatus: "Apply status",
      bulkApplyAssignment: "Apply assignment",
      selectAllFiltered: "Select all filtered",
      clearSelection: "Clear",
      saving: "saving...",
      markAs: "Mark as",
      sla: "SLA",
      noReviewer: "No reviewer",
      noDueDate: "No due date",
      bulkUpdateFailed: "Bulk update failed.",
      updateFailed: "Failed to update review status.",
    }
    : {
      total: "總提交數",
      pending: "待審核",
      edits: "需修改",
      approvedCoins: "已批 Coins",
      selected: "已選",
      filters: "篩選",
      statusFilter: "狀態",
      reviewerFilter: "審核者",
      slaFilter: "SLA",
      all: "全部",
      unassigned: "未指派",
      overdue: "已逾期",
      dueSoon: "24 小時內到期",
      noDue: "未設定期限",
      submitted: "提交於",
      coins: "Coins",
      screenshots: "Screenshots",
      link: "連結",
      screenshotAlt: "submission screenshot",
      reviewerNotes: "Reviewer notes",
      assignedReviewer: "指派審核者",
      reviewDueAt: "審核期限",
      saveAssignment: "儲存指派",
      assignFailed: "儲存指派失敗。",
      bulkActions: "批次操作",
      bulkApplyStatus: "批次套用狀態",
      bulkApplyAssignment: "批次套用指派",
      selectAllFiltered: "全選篩選結果",
      clearSelection: "清除",
      saving: "saving...",
      markAs: "標記為",
      sla: "SLA",
      noReviewer: "未指派",
      noDueDate: "未設定期限",
      bulkUpdateFailed: "批次更新失敗。",
      updateFailed: "更新審核狀態失敗。",
    };

  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [reviewers] = useState(initialReviewers);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [reviewerFilter, setReviewerFilter] = useState<string>("all");
  const [slaFilter, setSlaFilter] = useState<SlaFilter>("all");
  const [bulkStatus, setBulkStatus] = useState<SubmissionStatus>("Pending");
  const [bulkReviewerId, setBulkReviewerId] = useState<string>("");
  const [bulkDueAt, setBulkDueAt] = useState<string>("");

  const reviewerNameMap = useMemo(() => {
    const entries = reviewers.map((reviewer): [string, string] => [reviewer.id, reviewer.email]);
    return new Map(entries);
  }, [reviewers]);

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

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      if (statusFilter !== "all" && submission.status !== statusFilter) {
        return false;
      }

      if (reviewerFilter === "unassigned" && submission.assignedReviewerId) {
        return false;
      }

      if (reviewerFilter !== "all" && reviewerFilter !== "unassigned" && submission.assignedReviewerId !== reviewerFilter) {
        return false;
      }

      const slaState = getSlaState(submission);
      if (slaFilter === "overdue" && slaState !== "overdue") {
        return false;
      }

      if (slaFilter === "dueSoon" && slaState !== "dueSoon") {
        return false;
      }

      if (slaFilter === "none" && slaState !== "none") {
        return false;
      }

      return true;
    });
  }, [submissions, statusFilter, reviewerFilter, slaFilter]);

  function toggleSubmissionSelection(submissionId: string) {
    setSelectedIds((current) => {
      if (current.includes(submissionId)) {
        return current.filter((id) => id !== submissionId);
      }

      return [...current, submissionId];
    });
  }

  async function runBulkUpdate(payload: {
    status?: SubmissionStatus;
    assignedReviewerId?: string | null;
    reviewDueAt?: string | null;
  }) {
    if (selectedIds.length === 0) {
      return;
    }

    setError(null);
    const response = await fetch("/api/admin/submissions/bulk", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ids: selectedIds,
        ...payload,
      }),
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(result?.error ?? t.bulkUpdateFailed);
      return;
    }

    setSubmissions((current) =>
      current.map((item) => {
        if (!selectedIds.includes(item.id)) {
          return item;
        }

        return {
          ...item,
          status: payload.status ?? item.status,
          assignedReviewerId: payload.assignedReviewerId !== undefined ? payload.assignedReviewerId : item.assignedReviewerId,
          reviewDueAt: payload.reviewDueAt !== undefined ? payload.reviewDueAt : item.reviewDueAt,
        };
      }),
    );
  }

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

      <div className="glass-panel p-5">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{t.filters}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm text-slate-300">
            {t.statusFilter}
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white">
              <option value="all" className="bg-slate-900">{t.all}</option>
              {(["Pending", "Needs edits", "Approved"] as SubmissionStatus[]).map((status) => (
                <option key={status} value={status} className="bg-slate-900">{status}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-300">
            {t.reviewerFilter}
            <select value={reviewerFilter} onChange={(event) => setReviewerFilter(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white">
              <option value="all" className="bg-slate-900">{t.all}</option>
              <option value="unassigned" className="bg-slate-900">{t.unassigned}</option>
              {reviewers.map((reviewer) => (
                <option key={reviewer.id} value={reviewer.id} className="bg-slate-900">{reviewer.email}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-300">
            {t.slaFilter}
            <select value={slaFilter} onChange={(event) => setSlaFilter(event.target.value as SlaFilter)} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white">
              <option value="all" className="bg-slate-900">{t.all}</option>
              <option value="overdue" className="bg-slate-900">{t.overdue}</option>
              <option value="dueSoon" className="bg-slate-900">{t.dueSoon}</option>
              <option value="none" className="bg-slate-900">{t.noDue}</option>
            </select>
          </label>
        </div>
      </div>

      <div className="glass-panel p-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{t.bulkActions}</p>
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">{t.selected}: {selectedIds.length}</span>
          <button
            type="button"
            onClick={() => setSelectedIds(filteredSubmissions.map((item) => item.id))}
            className="rounded-full border border-white/20 px-3 py-1 text-xs text-slate-200"
          >
            {t.selectAllFiltered}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="rounded-full border border-white/20 px-3 py-1 text-xs text-slate-200"
          >
            {t.clearSelection}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm text-slate-300">{t.statusFilter}</label>
            <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as SubmissionStatus)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white">
              {(["Pending", "Needs edits", "Approved"] as SubmissionStatus[]).map((status) => (
                <option key={status} value={status} className="bg-slate-900">{status}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => runBulkUpdate({ status: bulkStatus })}
              className="w-full rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200"
            >
              {t.bulkApplyStatus}
            </button>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-slate-300">{t.assignedReviewer}</label>
            <select value={bulkReviewerId} onChange={(event) => setBulkReviewerId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white">
              <option value="" className="bg-slate-900">{t.unassigned}</option>
              {reviewers.map((reviewer) => (
                <option key={reviewer.id} value={reviewer.id} className="bg-slate-900">{reviewer.email}</option>
              ))}
            </select>
            <label className="text-sm text-slate-300">{t.reviewDueAt}</label>
            <input
              type="datetime-local"
              value={bulkDueAt}
              onChange={(event) => setBulkDueAt(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-white"
            />
            <button
              type="button"
              onClick={() => runBulkUpdate({
                assignedReviewerId: bulkReviewerId || null,
                reviewDueAt: bulkDueAt ? new Date(bulkDueAt).toISOString() : null,
              })}
              className="w-full rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200"
            >
              {t.bulkApplyAssignment}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {filteredSubmissions.map((submission) => (
          <article key={submission.id} className="glass-panel p-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(submission.id)}
                    onChange={() => toggleSubmissionSelection(submission.id)}
                    className="h-4 w-4 rounded border-white/20 bg-slate-900"
                    aria-label={`Select ${submission.id}`}
                  />
                  <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{submission.id}</p>
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${badgeClassName(submission.status)}`}>
                    {submission.status}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${slaBadgeClassName(getSlaState(submission))}`}>
                    {t.sla}: {getSlaState(submission)}
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
                <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm text-slate-300">
                  <div className="rounded-2xl bg-white/5 px-4 py-3">{t.assignedReviewer}: {submission.assignedReviewerId ? (reviewerNameMap.get(submission.assignedReviewerId) ?? submission.assignedReviewerId) : t.noReviewer}</div>
                  <div className="rounded-2xl bg-white/5 px-4 py-3">{t.reviewDueAt}: {submission.reviewDueAt ? new Date(submission.reviewDueAt).toLocaleString() : t.noDueDate}</div>
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
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    {t.assignedReviewer}
                    <select
                      value={submission.assignedReviewerId ?? ""}
                      onChange={(event) => {
                        const nextReviewerId = event.target.value || null;
                        setSubmissions((current) => current.map((item) => item.id === submission.id ? { ...item, assignedReviewerId: nextReviewerId } : item));
                      }}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
                    >
                      <option value="" className="bg-slate-900">{t.unassigned}</option>
                      {reviewers.map((reviewer) => (
                        <option key={reviewer.id} value={reviewer.id} className="bg-slate-900">{reviewer.email}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm text-slate-300">
                    {t.reviewDueAt}
                    <input
                      type="datetime-local"
                      value={formatDateTimeLocal(submission.reviewDueAt)}
                      onChange={(event) => {
                        const nextValue = event.target.value ? new Date(event.target.value).toISOString() : null;
                        setSubmissions((current) => current.map((item) => item.id === submission.id ? { ...item, reviewDueAt: nextValue } : item));
                      }}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    setError(null);
                    setSavingId(submission.id);
                    const response = await fetch(`/api/admin/submissions/${submission.id}`, {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        assignedReviewerId: submission.assignedReviewerId ?? null,
                        reviewDueAt: submission.reviewDueAt ?? null,
                      }),
                    });

                    if (!response.ok) {
                      const result = (await response.json().catch(() => null)) as { error?: string } | null;
                      setError(result?.error ?? t.assignFailed);
                    }

                    setSavingId(null);
                  }}
                  className="mt-4 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200"
                >
                  {t.saveAssignment}
                </button>

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
                            assignedReviewerId: submission.assignedReviewerId ?? null,
                            reviewDueAt: submission.reviewDueAt ?? null,
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
