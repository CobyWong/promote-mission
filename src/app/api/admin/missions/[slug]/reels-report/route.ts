import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import { isZhRequest } from "@/lib/api-locale";
import {
  getMissionLifecyclePhase,
  getMissionRankingConfirmationEndsAt,
  getMissionRankingCutoffDate,
} from "@/lib/mission-lifecycle";
import { getMissionTotalPrizeByDifficulty, getRankingRewardByPosition } from "@/lib/mission-rules";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SubmissionRow = Pick<
  Database["public"]["Tables"]["submissions"]["Row"],
  "id" | "user_id" | "creator_name" | "creator_handle" | "reel_url" | "status" | "submitted_at" | "checklist"
>;

type InsightRow = Pick<
  Database["public"]["Tables"]["reel_insights"]["Row"],
  "submission_id" | "likes" | "plays" | "comments" | "shares" | "saves" | "metric_date" | "created_at"
>;

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const isZh = isZhRequest(request);
  const [supabase, admin, { slug }] = await Promise.all([
    createSupabaseServerClient(),
    Promise.resolve(createSupabaseAdminClient()),
    context.params,
  ]);

  if (!supabase || !admin) {
    return NextResponse.json(
      { error: isZh ? "後台報告服務暫時不可用，請稍後再試。" : "Admin report service unavailable." },
      { status: 503 },
    );
  }

  const [adminSession, {
    data: { user },
  }] = await Promise.all([hasAdminSession(), supabase.auth.getUser()]);

  if (!adminSession && (!user || !isAdminEmail(user.email))) {
    return NextResponse.json(
      { error: isZh ? "需要管理員權限。" : "Admin access required." },
      { status: 403 },
    );
  }

  const { data: mission } = await admin
    .from("missions")
    .select("slug, title, difficulty, status, starts_at, ends_at")
    .eq("slug", slug)
    .maybeSingle();

  if (!mission) {
    return NextResponse.json({ error: isZh ? "找不到任務。" : "Mission not found." }, { status: 404 });
  }

  const { data: submissionData } = await admin
    .from("submissions")
    .select("id, user_id, creator_name, creator_handle, reel_url, status, submitted_at, checklist")
    .eq("mission_slug", slug)
    .in("status", ["Pending", "Approved"])
    .order("submitted_at", { ascending: true });

  const submissions = (submissionData ?? []) as SubmissionRow[];
  const submissionIds = submissions.map((item) => item.id);

  const { data: insightData } = submissionIds.length > 0
    ? await admin
      .from("reel_insights")
      .select("submission_id, likes, plays, comments, shares, saves, metric_date, created_at")
      .in("submission_id", submissionIds)
    : { data: [] as InsightRow[] };

  const insights = (insightData ?? []) as InsightRow[];
  const bySubmission = new Map<string, InsightRow[]>();

  for (const insight of insights) {
    if (!insight.submission_id) {
      continue;
    }

    const slot = bySubmission.get(insight.submission_id) ?? [];
    slot.push(insight);
    bySubmission.set(insight.submission_id, slot);
  }

  for (const [submissionId, rows] of bySubmission.entries()) {
    rows.sort((a, b) => {
      const byDate = b.metric_date.localeCompare(a.metric_date);
      if (byDate !== 0) {
        return byDate;
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    bySubmission.set(submissionId, rows);
  }

  const now = Date.now();
  const phase = getMissionLifecyclePhase({
    status: mission.status,
    starts_at: mission.starts_at,
    ends_at: mission.ends_at,
  }, now);
  const cutoffDate = getMissionRankingCutoffDate({
    status: mission.status,
    starts_at: mission.starts_at,
    ends_at: mission.ends_at,
  }, now);

  const reportRows = submissions
    .map((submission) => {
      const latestRows = bySubmission.get(submission.id) ?? [];
      const selectedInsight = cutoffDate
        ? latestRows.find((item) => item.metric_date <= cutoffDate)
        : latestRows[0];

      const checklist = submission.checklist && typeof submission.checklist === "object"
        ? submission.checklist as Record<string, unknown>
        : null;

      return {
        submissionId: submission.id,
        userId: submission.user_id,
        creatorName: submission.creator_name,
        creatorHandle: submission.creator_handle,
        reelUrl: submission.reel_url,
        status: submission.status,
        submittedAt: submission.submitted_at,
        collaboratorConfirmed: checklist?.addedCollaborator === true,
        likes: selectedInsight?.likes ?? 0,
        plays: selectedInsight?.plays ?? 0,
        comments: selectedInsight?.comments ?? 0,
        shares: selectedInsight?.shares ?? 0,
        saves: selectedInsight?.saves ?? 0,
        insightDate: selectedInsight?.metric_date ?? null,
      };
    })
    .sort((a, b) => {
      if (b.likes !== a.likes) {
        return b.likes - a.likes;
      }

      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1,
      prizeHkd: index < 3 ? getRankingRewardByPosition(index + 1, getMissionTotalPrizeByDifficulty(mission.difficulty)) : 0,
    }));

  return NextResponse.json({
    mission: {
      slug: mission.slug,
      title: mission.title,
      difficulty: mission.difficulty,
      status: mission.status,
      phase,
      rankingMetric: "likes",
      deadline: mission.ends_at,
      rankingFinalizedAt: cutoffDate ? mission.ends_at : null,
      rankingConfirmationEndsAt: getMissionRankingConfirmationEndsAt(mission.ends_at),
      rankingCutoffDate: cutoffDate,
    },
    rows: reportRows,
  });
}
