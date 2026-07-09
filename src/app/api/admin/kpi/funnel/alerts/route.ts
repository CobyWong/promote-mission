import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import { isZhRequest } from "@/lib/api-locale";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AlertSeverity = "warn" | "critical";

type MetricConfig = {
  key: "submissionCreated" | "submissionApproved" | "redemptionRequested";
  event: string;
  thresholdPct: number;
};

const minBaselineDaily = Number.parseFloat(process.env.FUNNEL_ALERT_MIN_BASELINE_DAILY ?? "5");

const metricConfig: MetricConfig[] = [
  {
    key: "submissionCreated",
    event: "funnel.submission_created",
    thresholdPct: Number.parseFloat(process.env.FUNNEL_ALERT_SUBMISSION_DROP_PCT ?? "30"),
  },
  {
    key: "submissionApproved",
    event: "funnel.submission_approved",
    thresholdPct: Number.parseFloat(process.env.FUNNEL_ALERT_APPROVE_DROP_PCT ?? "30"),
  },
  {
    key: "redemptionRequested",
    event: "funnel.redemption_requested",
    thresholdPct: Number.parseFloat(process.env.FUNNEL_ALERT_REDEEM_DROP_PCT ?? "30"),
  },
];

function normalizeThreshold(value: number) {
  if (Number.isNaN(value)) {
    return 30;
  }

  return Math.max(1, Math.min(95, value));
}

function normalizeMinBaseline(value: number) {
  if (Number.isNaN(value)) {
    return 5;
  }

  return Math.max(0, value);
}

function computeDropPct(current: number, baselineDailyAvg: number) {
  if (baselineDailyAvg <= 0) {
    return 0;
  }

  return Number((((baselineDailyAvg - current) / baselineDailyAvg) * 100).toFixed(2));
}

function pickSeverity(dropPct: number, thresholdPct: number): AlertSeverity {
  if (dropPct >= thresholdPct + 20) {
    return "critical";
  }

  return "warn";
}

export async function GET(request: Request) {
  const isZh = isZhRequest(request);
  const [supabase, admin] = await Promise.all([
    createSupabaseServerClient(),
    Promise.resolve(createSupabaseAdminClient()),
  ]);

  if (!supabase || !admin) {
    return NextResponse.json({ error: isZh ? "漏斗預警服務暫時不可用，請稍後再試。" : "Supabase admin mode is not configured." }, { status: 503 });
  }

  const [adminSession, {
    data: { user },
  }] = await Promise.all([hasAdminSession(), supabase.auth.getUser()]);

  if (!adminSession && (!user || !isAdminEmail(user.email))) {
    return NextResponse.json({ error: isZh ? "需要管理員權限。" : "Admin access required." }, { status: 403 });
  }

  const now = Date.now();
  const currentSinceIso = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const baselineSinceIso = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();

  const results = await Promise.all(
    metricConfig.map(async (metric) => {
      const [current, baselineTotal] = await Promise.all([
        admin
          .from("app_logs")
          .select("id", { count: "exact", head: true })
          .eq("event", metric.event)
          .gte("created_at", currentSinceIso),
        admin
          .from("app_logs")
          .select("id", { count: "exact", head: true })
          .eq("event", metric.event)
          .gte("created_at", baselineSinceIso)
          .lt("created_at", currentSinceIso),
      ]);

      const currentCount = current.count ?? 0;
      const baselineCount = baselineTotal.count ?? 0;
      const baselineDailyAvg = Number((baselineCount / 7).toFixed(2));
      const thresholdPct = normalizeThreshold(metric.thresholdPct);
      const minBaseline = normalizeMinBaseline(minBaselineDaily);
      const dropPct = computeDropPct(currentCount, baselineDailyAvg);
      const hasEnoughBaseline = baselineDailyAvg >= minBaseline;
      const triggered = hasEnoughBaseline && dropPct >= thresholdPct;

      return {
        key: metric.key,
        event: metric.event,
        thresholdPct,
        minBaseline,
        currentCount,
        baselineDailyAvg,
        dropPct,
        triggered,
        suppressed: !hasEnoughBaseline,
        severity: triggered ? pickSeverity(dropPct, thresholdPct) : null,
      };
    }),
  );

  const alerts = results
    .filter((item) => item.triggered)
    .map((item) => ({
      key: item.key,
      severity: item.severity,
      message: `${item.key} dropped by ${item.dropPct}% vs previous 7-day daily average`,
      message: isZh
        ? `${item.key} 相較過去 7 天日均值下跌 ${item.dropPct}%`
        : `${item.key} dropped by ${item.dropPct}% vs previous 7-day daily average`,
      currentCount: item.currentCount,
      baselineDailyAvg: item.baselineDailyAvg,
      minBaseline: item.minBaseline,
      thresholdPct: item.thresholdPct,
      dropPct: item.dropPct,
    }));

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    window: {
      currentSince: currentSinceIso,
      baselineSince: baselineSinceIso,
      baselineDays: 7,
    },
    alerts,
    metrics: results,
  });
}
