import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RangeType = "24h" | "7d";

type Bucket = {
  label: string;
  startsAt: string;
  errors: number;
  approvals: number;
  redemptions: number;
  notifications: number;
  rateLimited: number;
  idempotencyReplay: number;
  idempotencyInflight: number;
};

function classifyAbuseEvent(event: string | null) {
  if (!event) {
    return null;
  }

  if (event.endsWith(".idempotency_replay") || event.endsWith("_idempotency_replay")) {
    return "idempotencyReplay" as const;
  }

  if (event.endsWith(".idempotency_inflight") || event.endsWith("_idempotency_inflight")) {
    return "idempotencyInflight" as const;
  }

  if (event.endsWith(".rate_limited") || event.endsWith("_rate_limited")) {
    return "rateLimited" as const;
  }

  return null;
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

export async function GET(request: Request) {
  const [supabase, admin] = await Promise.all([
    createSupabaseServerClient(),
    Promise.resolve(createSupabaseAdminClient()),
  ]);

  if (!supabase || !admin) {
    return NextResponse.json({ error: "Supabase admin mode is not configured." }, { status: 503 });
  }

  const [adminSession, {
    data: { user },
  }] = await Promise.all([hasAdminSession(), supabase.auth.getUser()]);

  if (!adminSession && (!user || !isAdminEmail(user.email))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const rangeParam = searchParams.get("range");
  const range: RangeType = rangeParam === "7d" ? "7d" : "24h";

  const now = new Date();
  const bucketTimes = getBuckets(range, now);
  const startsAtIso = bucketTimes[0].toISOString();

  const [errorLogs, approvedSubmissions, redemptions, notifications, abuseLogs] = await Promise.all([
    admin.from("app_logs").select("created_at").eq("level", "error").gte("created_at", startsAtIso),
    admin.from("submissions").select("reviewed_at").eq("status", "Approved").gte("reviewed_at", startsAtIso),
    admin.from("reward_redemptions").select("created_at").gte("created_at", startsAtIso),
    admin.from("notifications").select("created_at").gte("created_at", startsAtIso),
    admin.from("app_logs").select("created_at, event").gte("created_at", startsAtIso),
  ]);

  const points: Bucket[] = bucketTimes.map((date) => ({
    label: buildLabel(range, date),
    startsAt: date.toISOString(),
    errors: 0,
    approvals: 0,
    redemptions: 0,
    notifications: 0,
    rateLimited: 0,
    idempotencyReplay: 0,
    idempotencyInflight: 0,
  }));

  for (const row of errorLogs.data ?? []) {
    const index = findBucketIndex(range, bucketTimes, row.created_at);
    if (index >= 0) {
      points[index].errors += 1;
    }
  }

  for (const row of approvedSubmissions.data ?? []) {
    const index = findBucketIndex(range, bucketTimes, row.reviewed_at);
    if (index >= 0) {
      points[index].approvals += 1;
    }
  }

  for (const row of redemptions.data ?? []) {
    const index = findBucketIndex(range, bucketTimes, row.created_at);
    if (index >= 0) {
      points[index].redemptions += 1;
    }
  }

  for (const row of notifications.data ?? []) {
    const index = findBucketIndex(range, bucketTimes, row.created_at);
    if (index >= 0) {
      points[index].notifications += 1;
    }
  }

  for (const row of abuseLogs.data ?? []) {
    const kind = classifyAbuseEvent(row.event);
    if (!kind) {
      continue;
    }

    const index = findBucketIndex(range, bucketTimes, row.created_at);
    if (index >= 0) {
      points[index][kind] += 1;
    }
  }

  return NextResponse.json({
    range,
    generatedAt: new Date().toISOString(),
    series: points,
  });
}
