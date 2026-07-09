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
    rateLimitedLast24h: number;
    idempotencyReplayLast24h: number;
    idempotencyInflightLast24h: number;
  };
};

type TrendPayload = {
  range: "24h" | "7d";
  generatedAt: string;
  series: Array<{
    label: string;
    startsAt: string;
    errors: number;
    approvals: number;
    redemptions: number;
    notifications: number;
    rateLimited: number;
    idempotencyReplay: number;
    idempotencyInflight: number;
  }>;
};

type FunnelPayload = {
  range: "24h" | "7d";
  generatedAt: string;
  since: string;
  funnel: {
    missionAccepted: number;
    submissionCreated: number;
    submissionApproved: number;
    redemptionRequested: number;
  };
  conversion: {
    acceptToSubmitPct: number;
    submitToApprovePct: number;
    approveToRedeemPct: number;
    acceptToRedeemPct: number;
  };
  series: Array<{
    label: string;
    startsAt: string;
    missionAccepted: number;
    submissionCreated: number;
    submissionApproved: number;
    redemptionRequested: number;
  }>;
};

type FunnelAlertsPayload = {
  generatedAt: string;
  alerts: Array<{
    key: string;
    severity: "warn" | "critical" | null;
    message: string;
    currentCount: number;
    baselineDailyAvg: number;
    thresholdPct: number;
    dropPct: number;
  }>;
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

type TrendMetricKey =
  | "errors"
  | "approvals"
  | "redemptions"
  | "notifications"
  | "rateLimited"
  | "idempotencyReplay"
  | "idempotencyInflight";

type FunnelMetricKey = "missionAccepted" | "submissionCreated" | "submissionApproved" | "redemptionRequested";
type TrendDirection = "up" | "down" | "flat";

function buildLinePath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function buildAreaPath(points: Array<{ x: number; y: number }>, baselineY: number) {
  if (points.length === 0) {
    return "";
  }

  const first = points[0];
  const last = points[points.length - 1];
  return `M ${first.x} ${baselineY} ${points.map((point) => `L ${point.x} ${point.y}`).join(" ")} L ${last.x} ${baselineY} Z`;
}

function buildSparklinePath(values: number[], width: number, height: number) {
  if (values.length === 0) {
    return "";
  }

  const max = Math.max(1, ...values);
  return values.map((value, index) => {
    const ratioX = values.length === 1 ? 0 : index / (values.length - 1);
    const x = ratioX * width;
    const y = height - (value / max) * height;
    return `${index === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
}

function getTrendDirection(values: number[]): TrendDirection {
  if (values.length < 4) {
    return "flat";
  }

  const windowSize = Math.min(3, Math.floor(values.length / 2));
  if (windowSize <= 0) {
    return "flat";
  }

  const latestWindow = values.slice(values.length - windowSize);
  const previousWindow = values.slice(values.length - windowSize * 2, values.length - windowSize);

  const latestAverage = latestWindow.reduce((sum, value) => sum + value, 0) / windowSize;
  const previousAverage = previousWindow.reduce((sum, value) => sum + value, 0) / windowSize;
  const delta = latestAverage - previousAverage;

  if (delta > 0.01) {
    return "up";
  }

  if (delta < -0.01) {
    return "down";
  }

  return "flat";
}

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
      trends: "KPI trends",
      funnel: "Growth funnel",
      funnelRangeLabel: "Window",
      funnelAlerts: "Funnel regression alerts",
      noFunnelAlerts: "No funnel regressions detected.",
      missionAccepted: "Mission accepted",
      submissionCreated: "Submission created",
      submissionApproved: "Submission approved",
      redemptionRequested: "Redemption requested",
      trendUp: "Up",
      trendDown: "Down",
      trendFlat: "Flat",
      acceptToSubmitPct: "Accept -> Submit",
      submitToApprovePct: "Submit -> Approve",
      approveToRedeemPct: "Approve -> Redeem",
      acceptToRedeemPct: "Accept -> Redeem",
      range24h: "24h",
      range7d: "7d",
      exportCsv: "Export CSV",
      errors: "Errors",
      approvals: "Approvals",
      redemptions: "Redemptions",
      notifications: "Notifications",
      trendRateLimited: "Rate-limited",
      trendReplay: "Idempotency replay",
      trendInflight: "Idempotency inflight",
      abuseSignals: "Abuse and replay signals (24h)",
      rateLimited: "Rate-limited",
      idempotencyReplays: "Idempotency replay",
      idempotencyInflight: "Idempotency inflight",
      recentAbuse: "Recent abuse/replay events",
      noAbuseEvents: "No abuse/replay events yet.",
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
      noErrors: "近期未發現錯誤。",
      updatedAt: "更新時間",
      trends: "KPI 趨勢",
      funnel: "轉化漏斗",
      funnelRangeLabel: "時間範圍",
      funnelAlerts: "漏斗回落警示",
      noFunnelAlerts: "目前未偵測到漏斗回落。",
      missionAccepted: "任務接受",
      submissionCreated: "提交建立",
      submissionApproved: "提交批核",
      redemptionRequested: "兌換申請",
      trendUp: "上升",
      trendDown: "下降",
      trendFlat: "持平",
      acceptToSubmitPct: "接受 -> 提交",
      submitToApprovePct: "提交 -> 批核",
      approveToRedeemPct: "批核 -> 兌換",
      acceptToRedeemPct: "接受 -> 兌換",
      range24h: "24 小時",
      range7d: "7 日",
      exportCsv: "匯出 CSV",
      errors: "錯誤",
      approvals: "批核",
      redemptions: "兌換請求",
      notifications: "通知",
      trendRateLimited: "限流命中",
      trendReplay: "冪等重播",
      trendInflight: "冪等進行中",
      abuseSignals: "濫用與重播信號（24 小時）",
      rateLimited: "限流命中",
      idempotencyReplays: "冪等重播",
      idempotencyInflight: "冪等進行中",
      recentAbuse: "最近濫用／重播事件",
      noAbuseEvents: "目前未偵測到濫用／重播事件。",
    };

  const [kpi, setKpi] = useState<KpiPayload | null>(null);
  const [trends, setTrends] = useState<TrendPayload | null>(null);
  const [trendRange, setTrendRange] = useState<"24h" | "7d">("24h");
  const [funnel, setFunnel] = useState<FunnelPayload | null>(null);
  const [funnelAlerts, setFunnelAlerts] = useState<FunnelAlertsPayload | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [abuseLogs, setAbuseLogs] = useState<LogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    metricLabel: string;
    bucketLabel: string;
    value: number;
  } | null>(null);

  useEffect(() => {
    async function load() {
      setError(null);
      const [kpiRes, trendRes, funnelRes, funnelAlertsRes, logRes, rateLimitedRes, replayRes, inflightRes] = await Promise.all([
        fetch("/api/admin/kpi", { cache: "no-store" }),
        fetch(`/api/admin/kpi/trends?range=${trendRange}`, { cache: "no-store" }),
        fetch(`/api/admin/kpi/funnel?range=${trendRange}`, { cache: "no-store" }),
        fetch("/api/admin/kpi/funnel/alerts", { cache: "no-store" }),
        fetch("/api/admin/kpi/logs?level=error&limit=6", { cache: "no-store" }),
        fetch("/api/admin/kpi/logs?level=all&eventSuffix=.rate_limited&limit=8", { cache: "no-store" }),
        fetch("/api/admin/kpi/logs?level=all&eventSuffix=.idempotency_replay&limit=8", { cache: "no-store" }),
        fetch("/api/admin/kpi/logs?level=all&eventSuffix=.idempotency_inflight&limit=8", { cache: "no-store" }),
      ]);

      if (!kpiRes.ok || !trendRes.ok || !logRes.ok || !funnelRes.ok || !funnelAlertsRes.ok) {
        setError(t.loadFailed);
        return;
      }

      const [kpiResult, trendResult, funnelResult, funnelAlertsResult, logResult, rateLimitedResult, replayResult, inflightResult] = await Promise.all([
        kpiRes.json() as Promise<KpiPayload>,
        trendRes.json() as Promise<TrendPayload>,
        funnelRes.json() as Promise<FunnelPayload>,
        funnelAlertsRes.json() as Promise<FunnelAlertsPayload>,
        logRes.json() as Promise<{ logs: LogItem[] }>,
        Promise.resolve(rateLimitedRes.ok ? rateLimitedRes.json() as Promise<{ logs: LogItem[] }> : { logs: [] }),
        Promise.resolve(replayRes.ok ? replayRes.json() as Promise<{ logs: LogItem[] }> : { logs: [] }),
        Promise.resolve(inflightRes.ok ? inflightRes.json() as Promise<{ logs: LogItem[] }> : { logs: [] }),
      ]);

      setKpi(kpiResult);
      setTrends(trendResult);
      setFunnel(funnelResult);
      setFunnelAlerts(funnelAlertsResult);
      setLogs(logResult.logs ?? []);
      const mergedAbuse = [...(rateLimitedResult.logs ?? []), ...(replayResult.logs ?? []), ...(inflightResult.logs ?? [])]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 8);
      setAbuseLogs(mergedAbuse);
    }

    load();
    const timer = setInterval(load, 45000);
    return () => clearInterval(timer);
  }, [t.loadFailed, trendRange]);

  if (error) {
    return <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-4 text-sm text-rose-100">{error}</div>;
  }

  if (!kpi) {
    return <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">{t.loading}</div>;
  }

  const funnelMetricConfig: Array<{ key: FunnelMetricKey; label: string; sparkColor: string }> = [
    { key: "missionAccepted", label: t.missionAccepted, sparkColor: "#38bdf8" },
    { key: "submissionCreated", label: t.submissionCreated, sparkColor: "#34d399" },
    { key: "submissionApproved", label: t.submissionApproved, sparkColor: "#f59e0b" },
    { key: "redemptionRequested", label: t.redemptionRequested, sparkColor: "#f472b6" },
  ];

  const stats = [
    { label: t.pendingSubmissions, value: kpi.kpis.pendingSubmissions },
    { label: t.dueSoonSubmissions, value: kpi.kpis.dueSoonSubmissions },
    { label: t.overdueSubmissions, value: kpi.kpis.overdueSubmissions },
    { label: t.pendingRedemptions, value: kpi.kpis.pendingRedemptions },
    { label: t.unreadNotifications, value: kpi.kpis.unreadNotifications },
    { label: t.approvedLast7d, value: kpi.kpis.approvedLast7d },
    { label: t.errorsLast24h, value: kpi.kpis.errorsLast24h },
    { label: t.rateLimited, value: kpi.kpis.rateLimitedLast24h },
    { label: t.idempotencyReplays, value: kpi.kpis.idempotencyReplayLast24h },
    { label: t.idempotencyInflight, value: kpi.kpis.idempotencyInflightLast24h },
  ];

  const trendSeries = trends?.series ?? [];
  const chartWidth = 760;
  const chartHeight = 280;
  const chartPaddingX = 28;
  const chartPaddingY = 20;
  const plotWidth = chartWidth - chartPaddingX * 2;
  const plotHeight = chartHeight - chartPaddingY * 2;

  const maxTrendValue = trendSeries.length > 0
    ? Math.max(
      1,
      ...trendSeries.flatMap((item) => [item.errors, item.approvals, item.redemptions, item.notifications]),
      ...trendSeries.flatMap((item) => [item.rateLimited, item.idempotencyReplay, item.idempotencyInflight]),
    )
    : 1;

  const metricConfig: Array<{ key: TrendMetricKey; label: string; stroke: string; fill: string }> = [
    { key: "errors", label: t.errors, stroke: "#fb7185", fill: "rgba(251,113,133,0.18)" },
    { key: "approvals", label: t.approvals, stroke: "#34d399", fill: "rgba(52,211,153,0.12)" },
    { key: "redemptions", label: t.redemptions, stroke: "#f59e0b", fill: "rgba(245,158,11,0.12)" },
    { key: "notifications", label: t.notifications, stroke: "#38bdf8", fill: "rgba(56,189,248,0.12)" },
    { key: "rateLimited", label: t.trendRateLimited, stroke: "#a78bfa", fill: "rgba(167,139,250,0.12)" },
    { key: "idempotencyReplay", label: t.trendReplay, stroke: "#f472b6", fill: "rgba(244,114,182,0.12)" },
    { key: "idempotencyInflight", label: t.trendInflight, stroke: "#facc15", fill: "rgba(250,204,21,0.12)" },
  ];

  function getMetricPoints(metric: TrendMetricKey) {
    if (trendSeries.length === 0) {
      return [] as Array<{ x: number; y: number; value: number; label: string }>;
    }

    return trendSeries.map((item, index) => {
      const ratioX = trendSeries.length === 1 ? 0 : index / (trendSeries.length - 1);
      const value = item[metric];
      const ratioY = value / maxTrendValue;
      return {
        x: chartPaddingX + ratioX * plotWidth,
        y: chartPaddingY + (1 - ratioY) * plotHeight,
        value,
        label: item.label,
      };
    });
  }

  return (
    <div className="admin-mobile-ui space-y-5">
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

      {funnel ? (
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">{t.funnel}</h3>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-300">
              <span>{t.funnelRangeLabel}:</span>
              <span className="font-semibold text-slate-100">{funnel.range === "24h" ? t.range24h : t.range7d}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {funnelMetricConfig.map((metric) => {
              const points = funnel.series.map((bucket) => bucket[metric.key]);
              const path = buildSparklinePath(points, 120, 26);
              const direction = getTrendDirection(points);
              const directionLabel = direction === "up"
                ? t.trendUp
                : direction === "down"
                  ? t.trendDown
                  : t.trendFlat;
              const directionBadgeClass = direction === "up"
                ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200"
                : direction === "down"
                  ? "border-rose-300/40 bg-rose-300/10 text-rose-200"
                  : "border-slate-400/40 bg-slate-500/10 text-slate-200";

              return (
                <div key={metric.key} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-400">{metric.label}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${directionBadgeClass}`}>{directionLabel}</span>
                  </div>
                  <p className="mt-1 text-2xl font-semibold text-white">{funnel.funnel[metric.key]}</p>
                  <div className="mt-2 h-7">
                    <svg viewBox="0 0 120 26" className="h-7 w-full" role="img" aria-label={`${metric.label} sparkline`}>
                      <path d={path} fill="none" stroke={metric.sparkColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
              {t.acceptToSubmitPct}: <span className="font-semibold">{funnel.conversion.acceptToSubmitPct}%</span>
            </div>
            <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
              {t.submitToApprovePct}: <span className="font-semibold">{funnel.conversion.submitToApprovePct}%</span>
            </div>
            <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
              {t.approveToRedeemPct}: <span className="font-semibold">{funnel.conversion.approveToRedeemPct}%</span>
            </div>
            <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
              {t.acceptToRedeemPct}: <span className="font-semibold">{funnel.conversion.acceptToRedeemPct}%</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="glass-panel p-5">
        <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">{t.funnelAlerts}</h3>
        <div className="mt-3 space-y-2">
          {!funnelAlerts || funnelAlerts.alerts.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">{t.noFunnelAlerts}</div>
          ) : funnelAlerts.alerts.map((alert) => (
            <div key={alert.key} className={`rounded-2xl border px-4 py-3 ${alert.severity === "critical" ? "border-rose-400/30 bg-rose-400/10" : "border-amber-300/25 bg-amber-300/10"}`}>
              <p className={`text-xs ${alert.severity === "critical" ? "text-rose-200" : "text-amber-200"}`}>{alert.key} · drop {alert.dropPct}% (threshold {alert.thresholdPct}%)</p>
              <p className={`mt-1 text-sm ${alert.severity === "critical" ? "text-rose-100" : "text-amber-100"}`}>{alert.message}</p>
              <p className={`mt-1 text-xs ${alert.severity === "critical" ? "text-rose-200" : "text-amber-200"}`}>current: {alert.currentCount} · baseline/day: {alert.baselineDailyAvg}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">{t.trends}</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTrendRange("24h")}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${trendRange === "24h" ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-200" : "border-white/20 text-slate-300"}`}
            >
              {t.range24h}
            </button>
            <button
              type="button"
              onClick={() => setTrendRange("7d")}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${trendRange === "7d" ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-200" : "border-white/20 text-slate-300"}`}
            >
              {t.range7d}
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40 p-3">
          <div className="relative min-w-[42rem]">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-[18rem] w-full" role="img" aria-label="KPI trend chart">
            <defs>
              <linearGradient id="kpi-grid-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(148,163,184,0.28)" />
                <stop offset="100%" stopColor="rgba(148,163,184,0.05)" />
              </linearGradient>
            </defs>

            {[0, 1, 2, 3, 4].map((step) => {
              const y = chartPaddingY + (step / 4) * plotHeight;
              return (
                <line
                  key={`grid-${step}`}
                  x1={chartPaddingX}
                  x2={chartPaddingX + plotWidth}
                  y1={y}
                  y2={y}
                  stroke="url(#kpi-grid-fade)"
                  strokeWidth="1"
                />
              );
            })}

            {metricConfig.map((metric, metricIndex) => {
              const points = getMetricPoints(metric.key);
              const flatPoints = points.map((point) => ({ x: point.x, y: point.y }));
              const linePath = buildLinePath(flatPoints);
              const areaPath = metricIndex === 0 ? buildAreaPath(flatPoints, chartPaddingY + plotHeight) : "";

              return (
                <g key={metric.key}>
                  {areaPath ? <path d={areaPath} fill={metric.fill} /> : null}
                  {linePath ? <path d={linePath} fill="none" stroke={metric.stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /> : null}
                  {points.map((point) => (
                    <g key={`${metric.key}-${point.label}`}>
                      <circle cx={point.x} cy={point.y} r="2.8" fill={metric.stroke} />
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="9"
                        fill="transparent"
                        onMouseEnter={() => setHoveredPoint({
                          x: point.x,
                          y: point.y,
                          metricLabel: metric.label,
                          bucketLabel: point.label,
                          value: point.value,
                        })}
                        onMouseLeave={() => setHoveredPoint((current) => {
                          if (!current) {
                            return null;
                          }

                          return current.metricLabel === metric.label && current.bucketLabel === point.label ? null : current;
                        })}
                      />
                    </g>
                  ))}
                </g>
              );
            })}

            {trendSeries.map((point, index) => {
              const ratioX = trendSeries.length === 1 ? 0 : index / (trendSeries.length - 1);
              const x = chartPaddingX + ratioX * plotWidth;
              const isEdge = index === 0 || index === trendSeries.length - 1;
              if (!isEdge && trendSeries.length > 8 && index % Math.ceil(trendSeries.length / 6) !== 0) {
                return null;
              }

              return (
                <text
                  key={`x-label-${point.startsAt}`}
                  x={x}
                  y={chartPaddingY + plotHeight + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill="rgba(148,163,184,0.9)"
                >
                  {point.label}
                </text>
              );
            })}
            </svg>

            {hoveredPoint ? (
              <div
                className="pointer-events-none absolute z-10 rounded-xl border border-cyan-300/30 bg-slate-900/95 px-3 py-2 text-xs text-slate-100 shadow-2xl"
                style={{
                  left: `calc(${(hoveredPoint.x / chartWidth) * 100}% + 8px)`,
                  top: `calc(${(hoveredPoint.y / chartHeight) * 100}% - 44px)`,
                }}
              >
                <p className="font-semibold text-cyan-200">{hoveredPoint.metricLabel}</p>
                <p className="mt-0.5 text-slate-200">{hoveredPoint.bucketLabel}: {hoveredPoint.value}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {metricConfig.map((metric) => (
              <span key={metric.key} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-slate-200">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: metric.stroke }} />
                {metric.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-panel p-5">
        <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">{t.recentAbuse}</h3>
        <div className="mt-3 space-y-2">
          {abuseLogs.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">{t.noAbuseEvents}</div>
          ) : abuseLogs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3">
              <p className="text-xs text-amber-200">{new Date(log.created_at).toLocaleString(locale === "en" ? "en-US" : "zh-HK")} · {log.event}</p>
              <p className="mt-1 text-sm text-amber-100">{log.message ?? "(no message)"}</p>
              {log.route ? <p className="mt-1 text-xs text-amber-200">{log.route}</p> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-5">
        <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400">{t.recentErrors}</h3>
        <div className="mt-2">
          <a
            href="/api/admin/kpi/logs/export?level=error&limit=1000"
            className="inline-flex rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
          >
            {t.exportCsv}
          </a>
        </div>
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
