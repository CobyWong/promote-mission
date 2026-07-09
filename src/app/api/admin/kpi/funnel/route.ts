import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import { isZhRequest } from "@/lib/api-locale";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RangeType = "24h" | "7d";

type FunnelSeriesPoint = {
  label: string;
  startsAt: string;
  missionAccepted: number;
  submissionCreated: number;
  submissionApproved: number;
  redemptionRequested: number;
};

function toPercentage(part: number, whole: number) {
  if (whole <= 0) {
    return 0;
  }

  return Number(((part / whole) * 100).toFixed(2));
}

async function countEventSince(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  event: string,
  sinceIso: string,
) {
  const { count } = await admin
    .from("app_logs")
    .select("id", { count: "exact", head: true })
    .eq("event", event)
    .gte("created_at", sinceIso);

  return count ?? 0;
}

function floorToHour(date: Date) {
  const next = new Date(date);
  next.setMinutes(0, 0, 0);
  return next;
}

function floorToDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getBuckets(range: RangeType, now: Date): Date[] {
  if (range === "24h") {
    const currentHour = floorToHour(now);
    const out: Date[] = [];
    for (let offset = 23; offset >= 0; offset -= 1) {
      out.push(new Date(currentHour.getTime() - offset * 60 * 60 * 1000));
    }
    return out;
  }

  const currentDay = floorToDay(now);
  const out: Date[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    out.push(new Date(currentDay.getTime() - offset * 24 * 60 * 60 * 1000));
  }
  return out;
}

function buildLabel(range: RangeType, date: Date) {
  if (range === "24h") {
    return date.toLocaleString("en-US", { hour: "2-digit", hour12: false });
  }

  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" });
}

function findBucketIndex(range: RangeType, buckets: Date[], timestamp: string | null) {
  if (!timestamp) {
    return -1;
  }

  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) {
    return -1;
  }

  if (range === "24h") {
    const base = buckets[0].getTime();
    const diff = Math.floor((time - base) / (60 * 60 * 1000));
    return diff >= 0 && diff < buckets.length ? diff : -1;
  }

  const base = buckets[0].getTime();
  const diff = Math.floor((time - base) / (24 * 60 * 60 * 1000));
  return diff >= 0 && diff < buckets.length ? diff : -1;
}

function mapEventToFunnelKey(event: string | null) {
  if (!event) {
    return null;
  }

  if (event === "funnel.mission_accepted") {
    return "missionAccepted" as const;
  }

  if (event === "funnel.submission_created") {
    return "submissionCreated" as const;
  }

  if (event === "funnel.submission_approved") {
    return "submissionApproved" as const;
  }

  if (event === "funnel.redemption_requested") {
    return "redemptionRequested" as const;
  }

  return null;
}

export async function GET(request: Request) {
  const isZh = isZhRequest(request);
  const [supabase, admin] = await Promise.all([
    createSupabaseServerClient(),
    Promise.resolve(createSupabaseAdminClient()),
  ]);

  if (!supabase || !admin) {
    return NextResponse.json({ error: isZh ? "漏斗分析服務暫時不可用，請稍後再試。" : "Supabase admin mode is not configured." }, { status: 503 });
  }

  const [adminSession, {
    data: { user },
  }] = await Promise.all([hasAdminSession(), supabase.auth.getUser()]);

  if (!adminSession && (!user || !isAdminEmail(user.email))) {
    return NextResponse.json({ error: isZh ? "需要管理員權限。" : "Admin access required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const rangeParam = searchParams.get("range");
  const range: RangeType = rangeParam === "24h" ? "24h" : "7d";
  const now = Date.now();
  const sinceIso = new Date(now - (range === "24h" ? 24 : 7 * 24) * 60 * 60 * 1000).toISOString();
  const bucketTimes = getBuckets(range, new Date(now));

  const [
    missionAccepted,
    submissionCreated,
    submissionApproved,
    redemptionRequested,
    funnelLogs,
  ] = await Promise.all([
    countEventSince(admin, "funnel.mission_accepted", sinceIso),
    countEventSince(admin, "funnel.submission_created", sinceIso),
    countEventSince(admin, "funnel.submission_approved", sinceIso),
    countEventSince(admin, "funnel.redemption_requested", sinceIso),
    admin
      .from("app_logs")
      .select("created_at, event")
      .gte("created_at", sinceIso)
      .in("event", [
        "funnel.mission_accepted",
        "funnel.submission_created",
        "funnel.submission_approved",
        "funnel.redemption_requested",
      ]),
  ]);

  const series: FunnelSeriesPoint[] = bucketTimes.map((date) => ({
    label: buildLabel(range, date),
    startsAt: date.toISOString(),
    missionAccepted: 0,
    submissionCreated: 0,
    submissionApproved: 0,
    redemptionRequested: 0,
  }));

  for (const row of funnelLogs.data ?? []) {
    const key = mapEventToFunnelKey(row.event);
    if (!key) {
      continue;
    }

    const index = findBucketIndex(range, bucketTimes, row.created_at);
    if (index >= 0) {
      series[index][key] += 1;
    }
  }

  return NextResponse.json({
    range,
    generatedAt: new Date().toISOString(),
    since: sinceIso,
    funnel: {
      missionAccepted,
      submissionCreated,
      submissionApproved,
      redemptionRequested,
    },
    conversion: {
      acceptToSubmitPct: toPercentage(submissionCreated, missionAccepted),
      submitToApprovePct: toPercentage(submissionApproved, submissionCreated),
      approveToRedeemPct: toPercentage(redemptionRequested, submissionApproved),
      acceptToRedeemPct: toPercentage(redemptionRequested, missionAccepted),
    },
    series,
  });
}
