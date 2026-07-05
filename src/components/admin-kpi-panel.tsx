"use client";

import { useEffect, useState } from "react";

import type { Locale } from "@/lib/i18n";

type KpiPayload = {
  generatedAt: string;
  kpis: {
    pendingSubmissions: number;
    dueSoonSubmissions: number;
    overdueSubmissions: number;
    pendingRedemptions: number;
    unreadNotifications: number;
    approvedLast7d: number;
    errorsLast24h: number;
  };
};

type LogItem = {
  id: string;
  level: string;
  category: string;
  event: string;
  message: string | null;
  route: string | null;
  created_at: string;
};

export function AdminKpiPanel({ locale }: { locale: Locale }) {
  const t = locale === "en"
    ? {
      title: "Ops KPI snapshot",
      loading: "Loading KPI...",
      loadFailed: "Failed to load KPI data.",
      pendingSubmissions: "Pending submissions",
      dueSoonSubmissions: "Due in 24h",
      overdueSubmissions: "Overdue reviews",
      pendingRedemptions: "Pending redemptions",
      unreadNotifications: "Unread notifications",
      approvedLast7d: "Approved in 7d",
      errorsLast24h: "Errors in 24h",
      recentErrors: "Recent errors",
      noErrors: "No recent errors.",
      updatedAt: "Updated",
    }
    : {
      title: "Ops KPI 快照",
      loading: "載入 KPI 中...",
      loadFailed: "載入 KPI 失敗。",
      pendingSubmissions: "待審核提交",
      dueSoonSubmissions: "24 小時內到期",
      overdueSubmissions: "審核逾期",
      pendingRedemptions: "待處理兌換",
      unreadNotifications: "未讀通知",
      approvedLast7d: "7 日內已批核",
      errorsLast24h: "24 小時錯誤",
      recentErrors: "最近錯誤",
      noErrors: "最近未有錯誤。",
      updatedAt: "更新時間",
    };

  const [kpi, setKpi] = useState<KpiPayload | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setError(null);
      const [kpiRes, logRes] = await Promise.all([
        fetch("/api/admin/kpi", { cache: "no-store" }),
        fetch("/api/admin/kpi/logs?level=error&limit=6", { cache: "no-store" }),
      ]);

      if (!kpiRes.ok || !logRes.ok) {
        setError(t.loadFailed);
        return;
      }

      const [kpiResult, logResult] = await Promise.all([
        kpiRes.json() as Promise<KpiPayload>,
        logRes.json() as Promise<{ logs: LogItem[] }>,
      ]);

      setKpi(kpiResult);
      setLogs(logResult.logs ?? []);
    }

    load();
    const timer = setInterval(load, 45000);
    return () => clearInterval(timer);
  }, [t.loadFailed]);

  if (error) {
    return <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-100">{error}</div>;
  }

  if (!kpi) {
    return <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">{t.loading}</div>;
  }

  const stats = [
    { label: t.pendingSubmissions, value: kpi.kpis.pendingSubmissions },
    { label: t.dueSoonSubmissions, value: kpi.kpis.dueSoonSubmissions },
    { label: t.overdueSubmissions, value: kpi.kpis.overdueSubmissions },
    { label: t.pendingRedemptions, value: kpi.kpis.pendingRedemptions },
    { label: t.unreadNotifications, value: kpi.kpis.unreadNotifications },
    { label: t.approvedLast7d, value: kpi.kpis.approvedLast7d },
    { label: t.errorsLast24h, value: kpi.kpis.errorsLast24h },
  ];

  return (
    <div className="space-y-5">
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">{t.title}</h2>
          <p className="text-xs text-slate-400">{t.updatedAt}: {new Date(kpi.generatedAt).toLocaleString(locale === "en" ? "en-US" : "zh-HK")}</p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs text-slate-400">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-5">
        <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">{t.recentErrors}</h3>
        <div className="mt-3 space-y-2">
          {logs.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">{t.noErrors}</div>
          ) : logs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3">
              <p className="text-xs text-rose-200">{new Date(log.created_at).toLocaleString(locale === "en" ? "en-US" : "zh-HK")} · {log.category}/{log.event}</p>
              <p className="mt-1 text-sm text-rose-100">{log.message ?? "(no message)"}</p>
              {log.route ? <p className="mt-1 text-xs text-rose-200">{log.route}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
