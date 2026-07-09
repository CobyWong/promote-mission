"use client";

import { useEffect, useState } from "react";

import type { Locale } from "@/lib/i18n";

type HoldItem = {
  id: string;
  referral_id: string;
  inviter_user_id: string;
  invited_user_id: string;
  submission_id: string;
  amount: number;
  risk_score: number;
  risk_flags: string[];
  status: string;
  hold_until: string | null;
  created_at: string;
};

type Props = {
  locale: Locale;
};

export function AdminReferralHoldBoard({ locale }: Props) {
  const t = locale === "en"
    ? {
      title: "Referral Hold Review Queue",
      desc: "Approve or reject held referral rewards.",
      refresh: "Refresh",
      approve: "Approve",
      reject: "Reject",
      pending: "Pending holds",
      empty: "No pending holds.",
      reviewing: "Reviewing...",
    }
    : {
      title: "推薦獎勵暫扣審核隊列",
      desc: "審核已暫扣的推薦獎勵，並可執行批准或拒絕。",
      refresh: "重新載入",
      approve: "批准",
      reject: "拒絕",
      pending: "待審核暫扣",
      empty: "目前尚無待審核暫扣項目。",
      reviewing: "處理中...",
    };

  const [holds, setHolds] = useState<HoldItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/referral-holds", { cache: "no-store" });
      if (!response.ok) {
        setHolds([]);
        return;
      }

      const data = (await response.json()) as { holds?: HoldItem[] };
      setHolds(data.holds ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  async function review(id: string, action: "approve" | "reject") {
    setReviewingId(id);
    try {
      const response = await fetch(`/api/admin/referral-holds/${id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        await load();
      }
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <div className="glass-panel mt-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{t.pending}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{t.title}</h2>
          <p className="mt-2 text-sm text-slate-300">{t.desc}</p>
        </div>
        <button type="button" onClick={load} className="rounded-full border border-white/20 px-4 py-2 text-sm text-slate-100">
          {t.refresh}
        </button>
      </div>

      {loading ? <p className="mt-4 text-slate-300">Loading...</p> : null}

      {!loading && holds.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-slate-300">{t.empty}</p>
      ) : null}

      <div className="mt-4 space-y-3">
        {holds.map((hold) => (
          <div key={hold.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold">Hold #{hold.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-amber-200">+{hold.amount} Coins</p>
            </div>

            <div className="mt-2 grid gap-1 text-xs text-slate-300">
              <p>Submission: {hold.submission_id}</p>
              <p>Inviter: {hold.inviter_user_id}</p>
              <p>Invited: {hold.invited_user_id}</p>
              <p>Risk score: {hold.risk_score}</p>
              <p>Flags: {(hold.risk_flags ?? []).join(", ") || "none"}</p>
              <p>Hold until: {hold.hold_until ?? "-"}</p>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => review(hold.id, "approve")}
                disabled={reviewingId === hold.id}
                className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-200 disabled:opacity-60"
              >
                {reviewingId === hold.id ? t.reviewing : t.approve}
              </button>
              <button
                type="button"
                onClick={() => review(hold.id, "reject")}
                disabled={reviewingId === hold.id}
                className="rounded-full border border-rose-300/40 bg-rose-300/10 px-3 py-1 text-xs text-rose-200 disabled:opacity-60"
              >
                {t.reject}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
