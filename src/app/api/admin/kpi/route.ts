import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
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

  const now = Date.now();
  const iso24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const iso7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: pendingSubmissions },
    { count: dueSoonSubmissions },
    { count: overdueSubmissions },
    { count: pendingRedemptions },
    { count: unreadNotifications },
    { count: error24h },
    { count: approved7d },
    { count: rateLimited24h },
    { count: idempotencyReplay24h },
    { count: idempotencyInflight24h },
  ] = await Promise.all([
    admin.from("submissions").select("id", { count: "exact", head: true }).eq("status", "Pending"),
    admin
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .neq("status", "Approved")
      .not("review_due_at", "is", null)
      .gte("review_due_at", new Date(now).toISOString())
      .lte("review_due_at", new Date(now + 24 * 60 * 60 * 1000).toISOString()),
    admin
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .neq("status", "Approved")
      .not("review_due_at", "is", null)
      .lt("review_due_at", new Date(now).toISOString()),
    admin.from("reward_redemptions").select("id", { count: "exact", head: true }).eq("status", "Pending"),
    admin.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false),
    admin.from("app_logs").select("id", { count: "exact", head: true }).eq("level", "error").gte("created_at", iso24h),
    admin.from("submissions").select("id", { count: "exact", head: true }).eq("status", "Approved").gte("reviewed_at", iso7d),
    admin.from("app_logs").select("id", { count: "exact", head: true }).like("event", "%.rate_limited").gte("created_at", iso24h),
    admin.from("app_logs").select("id", { count: "exact", head: true }).like("event", "%.idempotency_replay").gte("created_at", iso24h),
    admin.from("app_logs").select("id", { count: "exact", head: true }).like("event", "%.idempotency_inflight").gte("created_at", iso24h),
  ]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    kpis: {
      pendingSubmissions: pendingSubmissions ?? 0,
      dueSoonSubmissions: dueSoonSubmissions ?? 0,
      overdueSubmissions: overdueSubmissions ?? 0,
      pendingRedemptions: pendingRedemptions ?? 0,
      unreadNotifications: unreadNotifications ?? 0,
      approvedLast7d: approved7d ?? 0,
      errorsLast24h: error24h ?? 0,
      rateLimitedLast24h: rateLimited24h ?? 0,
      idempotencyReplayLast24h: idempotencyReplay24h ?? 0,
      idempotencyInflightLast24h: idempotencyInflight24h ?? 0,
    },
  });
}
