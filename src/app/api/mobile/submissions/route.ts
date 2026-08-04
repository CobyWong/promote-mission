import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";
import { logApiEvent, reportApiError } from "@/lib/observability";

type TimelineEvent = {
  key: string;
  label: string;
  at: string;
  tone: "neutral" | "success" | "danger";
};

type SubmissionCursor = {
  submittedAt: string;
  id: string;
};

function encodeCursor(cursor: SubmissionCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(raw: string | null): SubmissionCursor | null {
  if (!raw) {
    return null;
  }

  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as SubmissionCursor;
    if (!parsed?.submittedAt || !parsed?.id) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function normalizeStatusFilter(raw: string | null) {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value || value === "all") {
    return null;
  }

  if (value === "pending" || value === "approved" || value === "rejected") {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  return null;
}

function getMobileSubmissionPipelineStatus(submission: Pick<Database["public"]["Tables"]["submissions"]["Row"], "status" | "reel_url" | "checklist">) {
  const normalizedStatus = submission.status.toLowerCase();
  if (normalizedStatus === "approved") {
    return "approved";
  }

  if (normalizedStatus === "rejected") {
    return "rejected";
  }

  if (submission.reel_url.startsWith("pending://awaiting-collaborator/")) {
    return "awaiting_reel_url";
  }

  const checklist = submission.checklist && typeof submission.checklist === "object" && !Array.isArray(submission.checklist)
    ? (submission.checklist as Record<string, unknown>)
    : null;

  if (checklist?.autoDetectedByInstagramSync === true) {
    return "synced_pending_review";
  }

  return "awaiting_system_sync";
}

function buildTimeline(submission: Database["public"]["Tables"]["submissions"]["Row"]): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      key: "submitted",
      label: "Submitted",
      at: submission.submitted_at,
      tone: "neutral",
    },
  ];

  if (submission.review_due_at) {
    events.push({
      key: "reviewDue",
      label: "Review due",
      at: submission.review_due_at,
      tone: "neutral",
    });
  }

  if (submission.reviewed_at) {
    const status = submission.status.toLowerCase();
    const tone = status === "approved" ? "success" : status === "rejected" ? "danger" : "neutral";
    events.push({
      key: "reviewed",
      label: `Reviewed (${submission.status})`,
      at: submission.reviewed_at,
      tone,
    });
  }

  if (submission.sla_breached_at) {
    events.push({
      key: "slaBreached",
      label: "SLA breached",
      at: submission.sla_breached_at,
      tone: "danger",
    });
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  const isZh = isZhRequest(request);

  try {
    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json({ error: isZh ? "投稿服務暫時不可用，請稍後再試。" : "Supabase admin mode is not configured." }, { status: 503 });
    }

    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

    if (!token) {
      return NextResponse.json({ error: isZh ? "缺少登入憑證，請重新登入。" : "Missing bearer token." }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json({ error: isZh ? "投稿服務暫時不可用，請稍後再試。" : "Supabase admin mode is not configured." }, { status: 503 });
    }

    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: isZh ? "登入狀態無效或已過期，請重新登入。" : (userError?.message ?? "Unauthorized.") }, { status: 401 });
    }

    const url = new URL(request.url);
    const requestedLimit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
    const requestedCursor = decodeCursor(url.searchParams.get("cursor"));
    const search = (url.searchParams.get("q") ?? "").trim();
    const statusFilter = normalizeStatusFilter(url.searchParams.get("status"));
    const includeTotal = ["1", "true", "yes"].includes((url.searchParams.get("includeTotal") ?? "").toLowerCase());
    const limit = Number.isNaN(requestedLimit) ? 20 : Math.min(Math.max(requestedLimit, 1), 50);

    if (url.searchParams.get("cursor") && !requestedCursor) {
      return NextResponse.json({ error: isZh ? "分頁游標格式無效。" : "Invalid cursor." }, { status: 400 });
    }

    const columns = "id, mission_slug, mission_title, mission_brand, reward_coins, status, submitted_at, reviewed_at, review_due_at, sla_breached_at, reel_url, caption_summary, notes, reviewed_by, checklist";

    let query = includeTotal
      ? admin.from("submissions").select(columns, { count: "exact" })
      : admin.from("submissions").select(columns);

    query = query.eq("user_id", user.id);

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    if (search) {
      const escapedSearch = search.replaceAll(",", " ");
      query = query.or(`mission_title.ilike.%${escapedSearch}%,mission_brand.ilike.%${escapedSearch}%`);
    }

    if (requestedCursor) {
      query = query.or(
        `submitted_at.lt.${requestedCursor.submittedAt},and(submitted_at.eq.${requestedCursor.submittedAt},id.lt.${requestedCursor.id})`,
      );
    }

    const { data, error, count } = await query
      .order("submitted_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (error) {
      return NextResponse.json({ error: isZh ? "讀取投稿紀錄失敗，請稍後再試。" : error.message }, { status: 400 });
    }

    const rawRows = data ?? [];
    const hasMore = rawRows.length > limit;
    const pageRows = hasMore ? rawRows.slice(0, limit) : rawRows;

    const submissions = pageRows.map((submission) => ({
      id: submission.id,
      missionSlug: submission.mission_slug,
      missionTitle: submission.mission_title,
      missionBrand: submission.mission_brand,
      rewardCoins: submission.reward_coins,
      status: submission.status,
      reelUrl: submission.reel_url,
      captionSummary: submission.caption_summary,
      notes: submission.notes,
      reviewedBy: submission.reviewed_by,
      submittedAt: submission.submitted_at,
      reviewedAt: submission.reviewed_at,
      reviewDueAt: submission.review_due_at,
      pipelineStatus: getMobileSubmissionPipelineStatus(submission),
      timeline: buildTimeline(submission as Database["public"]["Tables"]["submissions"]["Row"]),
    }));

    const total = includeTotal ? (count ?? submissions.length) : null;
    const lastItem = submissions.at(-1);
    const nextCursor = hasMore && lastItem
      ? encodeCursor({
        submittedAt: lastItem.submittedAt,
        id: lastItem.id,
      })
      : null;

    await logApiEvent({
      level: "info",
      route: "/api/mobile/submissions",
      event: "mobile.submissions.history_loaded",
      request,
      requestId,
      userId: user.id,
      context: {
        statusFilter,
        searchLength: search.length,
        includeTotal,
        hasMore,
      },
    });

    return NextResponse.json({
      submissions,
      pagination: {
        limit,
        total,
        includeTotal,
        hasMore,
        nextCursor,
      },
      filters: {
        status: statusFilter,
        q: search || null,
      },
    });
  } catch (error) {
    await reportApiError({
      route: "/api/mobile/submissions",
      request,
      requestId,
      error,
      context: {
        handler: "GET",
      },
    });
    return NextResponse.json({ error: isZh ? "載入投稿資料時發生未預期錯誤，請稍後再試。" : "Unexpected error while loading submissions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const isZh = isZhRequest(request);

  return NextResponse.json(
    {
      error: isZh
        ? "已改為 missionone_hk 系統同步自動提交，Mobile 端不再支援手動提交。"
        : "Manual mobile submission is disabled. Mission submissions are created automatically from missionone_hk system sync.",
    },
    { status: 410 },
  );
}
