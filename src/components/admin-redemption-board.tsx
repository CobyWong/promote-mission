"use client";

import { useMemo, useState } from "react";

import type { RewardRedemption, RewardRedemptionStatus } from "@/lib/data";
import type { Locale } from "@/lib/i18n";

type AdminRedemptionBoardProps = {
  initialRedemptions: RewardRedemption[];
  locale: Locale;
};

function statusClassName(status: RewardRedemptionStatus) {
  if (status === "Fulfilled") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "Rejected") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-200";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-200";
}

export function AdminRedemptionBoard({ initialRedemptions, locale }: AdminRedemptionBoardProps) {
  const t = locale === "en"
    ? {
      total: "Total redemptions",
      pending: "Pending",
      fulfilled: "Fulfilled",
      rejected: "Rejected",
      saving: "saving...",
      noNotes: "No notes",
      action: "Fulfillment action",
      updateFailed: "Failed to update redemption status.",
      markAs: "Mark as",
    }
    : {
      total: "總兌換數",
      pending: "待處理",
      fulfilled: "已完成",
      rejected: "已拒絕",
      saving: "儲存中...",
      noNotes: "無備註",
      action: "履約操作",
      updateFailed: "更新兌換狀態失敗。",
      markAs: "標記為",
    };

  const [redemptions, setRedemptions] = useState(initialRedemptions);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    return {
      total: redemptions.length,
      pending: redemptions.filter((item) => item.status === "Pending").length,
      fulfilled: redemptions.filter((item) => item.status === "Fulfilled").length,
      rejected: redemptions.filter((item) => item.status === "Rejected").length,
    };
  }, [redemptions]);

  return (
    <div className="admin-mobile-ui space-y-8">
      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: t.total, value: summary.total.toString() },
          { label: t.pending, value: summary.pending.toString() },
          { label: t.fulfilled, value: summary.fulfilled.toString() },
          { label: t.rejected, value: summary.rejected.toString() },
        ].map((item) => (
          <div key={item.label} className="glass-panel p-5">
            <p className="text-sm text-slate-400">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6">
        {redemptions.map((item) => (
          <article key={item.id} className="glass-panel p-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{item.id}</p>
                  <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClassName(item.status)}`}>
                    {item.status}
                  </span>
                  {savingId === item.id ? <span className="text-xs text-slate-400">{t.saving}</span> : null}
                </div>
                <h2 className="mt-3 text-xl font-semibold text-white">{item.rewardName}</h2>
                <p className="mt-3 text-slate-300">{item.createdAt} · {item.costCoins.toLocaleString()} Coins</p>
                <p className="mt-3 text-sm text-slate-300">{item.notes || t.noNotes}</p>
              </div>

              <div className="w-full max-w-xl rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                <p className="font-semibold text-white">{t.action}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {(["Pending", "Fulfilled", "Rejected"] as RewardRedemptionStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={async () => {
                        const previous = redemptions;
                        setError(null);
                        setSavingId(item.id);
                        setRedemptions((current) => current.map((entry) => (entry.id === item.id ? { ...entry, status } : entry)));

                        const response = await fetch(`/api/admin/redemptions/${item.id}`, {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            status,
                            notes: item.notes,
                          }),
                        });

                        if (!response.ok) {
                          const result = (await response.json()) as { error?: string };
                          setError(result.error ?? t.updateFailed);
                          setRedemptions(previous);
                        }

                        setSavingId(null);
                      }}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${statusClassName(status)}`}
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
