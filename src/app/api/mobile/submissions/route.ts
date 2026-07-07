import { NextResponse } from "next/server";

import { missions } from "@/lib/data";
import { getCreatorLevelFromTotalExp, getMissionRequiredLevel, MAX_CREATOR_LEVEL } from "@/lib/mission-rules";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";

type SubmissionBody = {
  slug?: string;
  reelUrl?: string;
  captionSummary?: string;
  notes?: string;
  checks?: Record<string, boolean>;
};

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
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase admin mode is not configured." }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

  if (!token) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin mode is not configured." }, { status: 503 });
  }

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: userError?.message ?? "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const requestedLimit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);
  const requestedCursor = decodeCursor(url.searchParams.get("cursor"));
  const search = (url.searchParams.get("q") ?? "").trim();
  const statusFilter = normalizeStatusFilter(url.searchParams.get("status"));
  const includeTotal = ["1", "true", "yes"].includes((url.searchParams.get("includeTotal") ?? "").toLowerCase());
  const limit = Number.isNaN(requestedLimit) ? 20 : Math.min(Math.max(requestedLimit, 1), 50);

  if (url.searchParams.get("cursor") && !requestedCursor) {
    return NextResponse.json({ error: "Invalid cursor." }, { status: 400 });
  }

  const columns = "id, mission_slug, mission_title, mission_brand, reward_coins, status, submitted_at, reviewed_at, review_due_at, sla_breached_at, reel_url, caption_summary, notes, reviewed_by";

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
    return NextResponse.json({ error: error.message }, { status: 400 });
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
}

export async function POST(request: Request) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Supabase admin mode is not configured." }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

  if (!token) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase admin mode is not configured." }, { status: 503 });
  }

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: userError?.message ?? "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as SubmissionBody | null;
  const slug = String(body?.slug ?? "").trim();
  const reelUrl = String(body?.reelUrl ?? "").trim();
  const captionSummary = String(body?.captionSummary ?? "").trim() || null;
  const notes = String(body?.notes ?? "").trim() || null;
  const checks = body?.checks && typeof body.checks === "object" ? body.checks : {};

  if (!slug) {
    return NextResponse.json({ error: "Mission slug is required." }, { status: 400 });
  }

  const { data: missionRow } = await admin
    .from("missions")
    .select("slug, title, brand, reward_coins, difficulty")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  const mission = missionRow
    ? {
      slug: missionRow.slug,
      title: missionRow.title,
      brand: missionRow.brand,
      points: missionRow.reward_coins,
      difficulty: missionRow.difficulty,
    }
    : missions.find((item) => item.slug === slug);

  if (!mission) {
    return NextResponse.json({ error: "Mission not found." }, { status: 404 });
  }

  const { data: approvedSubmissions } = await admin
    .from("submissions")
    .select("reward_coins")
    .eq("user_id", user.id)
    .eq("status", "Approved");

  const approvedExp = (approvedSubmissions ?? []).reduce((sum, item) => sum + Math.max(item.reward_coins ?? 0, 0), 0);
  const creatorLevel = getCreatorLevelFromTotalExp(approvedExp);
  const missionRequiredLevel = getMissionRequiredLevel(mission.difficulty ?? "Easy");

  if (creatorLevel < missionRequiredLevel) {
    return NextResponse.json(
      { error: `This mission requires level ${missionRequiredLevel}. Your current level is ${creatorLevel}/${MAX_CREATOR_LEVEL}.` },
      { status: 403 },
    );
  }

  if (!reelUrl.startsWith("http")) {
    return NextResponse.json({ error: "A valid reel URL is required." }, { status: 400 });
  }

  if (!checks.addedCollaborator) {
    return NextResponse.json({ error: "Please add @missionone.hk as collaborator before submission." }, { status: 400 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, instagram_handle")
    .eq("id", user.id)
    .maybeSingle();

  const profileRow = (profile ?? null) as Pick<
    Database["public"]["Tables"]["profiles"]["Row"],
    "full_name" | "instagram_handle"
  > | null;

  const submissionPayload: Database["public"]["Tables"]["submissions"]["Insert"] = {
    user_id: user.id,
    mission_slug: mission.slug,
    mission_title: mission.title,
    mission_brand: mission.brand,
    reward_coins: mission.points,
    reel_url: reelUrl,
    caption_summary: captionSummary,
    notes,
    checklist: checks,
    screenshot_count: 0,
    screenshot_paths: [],
    creator_name: profileRow?.full_name ?? user.email ?? "Creator",
    creator_handle: profileRow?.instagram_handle ?? null,
    status: "Pending",
  };

  const { data, error } = await admin
    .from("submissions")
    .insert(submissionPayload)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 });
}
