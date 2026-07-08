import { NextResponse } from "next/server";

import type { SubmissionStatus } from "@/lib/data";
import { hasAdminSession } from "@/lib/admin-session";
import { awardGamePassLevelUpRewards } from "@/lib/game-pass";
import { createUserNotification } from "@/lib/notifications";
import { createAppLog } from "@/lib/observability";
import { handleReferralPostSettlement } from "@/lib/referral-growth";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedStatuses: SubmissionStatus[] = ["Pending", "Needs edits", "Approved"];

async function syncSlaBreachForIds(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  ids: string[],
) {
  if (!admin || ids.length === 0) {
    return;
  }

  const { data } = await admin
    .from("submissions")
    .select("id, status, review_due_at, sla_breached_at")
    .in("id", ids);

  const rows = (data ?? []) as Array<{
    id: string;
    status: string;
    review_due_at: string | null;
    sla_breached_at: string | null;
  }>;

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const toMarkBreached: string[] = [];
  const toClearBreached: string[] = [];

  for (const row of rows) {
    const dueTime = row.review_due_at ? new Date(row.review_due_at).getTime() : null;
    const hasBreach = Boolean(row.sla_breached_at);
    const isOverdue = row.status !== "Approved" && dueTime !== null && !Number.isNaN(dueTime) && dueTime < now;

    if (isOverdue && !hasBreach) {
      toMarkBreached.push(row.id);
      continue;
    }

    if (!isOverdue && hasBreach) {
      toClearBreached.push(row.id);
    }
  }

  if (toMarkBreached.length > 0) {
    await admin.from("submissions").update({ sla_breached_at: nowIso }).in("id", toMarkBreached);
  }

  if (toClearBreached.length > 0) {
    await admin.from("submissions").update({ sla_breached_at: null }).in("id", toClearBreached);
  }
}

function toIsoOrNull(value: unknown) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  if (!value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export async function PATCH(request: Request) {
  const [supabase, admin] = await Promise.all([
    createSupabaseServerClient(),
    Promise.resolve(createSupabaseAdminClient()),
  ]);

  if (!supabase || !admin) {
    await createAppLog({
      level: "error",
      category: "admin_review",
      event: "bulk_update_unavailable",
      message: "Supabase admin mode is not configured.",
      route: "/api/admin/submissions/bulk",
    });
    return NextResponse.json({ error: "Supabase admin mode is not configured." }, { status: 503 });
  }

  const [adminSession, {
    data: { user },
  }] = await Promise.all([hasAdminSession(), supabase.auth.getUser()]);

  if (!adminSession && (!user || !isAdminEmail(user.email))) {
    await createAppLog({
      level: "warn",
      category: "auth",
      event: "admin_bulk_forbidden",
      message: "Admin access required.",
      route: "/api/admin/submissions/bulk",
      userId: user?.id ?? null,
    });
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const reviewerId = user?.id ?? null;
  const body = (await request.json().catch(() => null)) as {
    ids?: string[];
    status?: SubmissionStatus;
    notes?: string;
    assignedReviewerId?: string | null;
    reviewDueAt?: string | null;
  } | null;

  const ids = Array.isArray(body?.ids) ? body.ids.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "ids are required." }, { status: 400 });
  }

  const { data: targetSubmissions } = await admin
    .from("submissions")
    .select("id, user_id, mission_title, reward_coins, status")
    .in("id", ids);

  const submissionRows = (targetSubmissions ?? []) as Array<{
    id: string;
    user_id: string;
    mission_title: string;
    reward_coins: number;
    status: string;
  }>;
  const submissionMap = new Map(submissionRows.map((item) => [item.id, item]));

  const status = body?.status;
  const notes = typeof body?.notes === "string" ? body.notes : undefined;
  const assignedReviewerId = typeof body?.assignedReviewerId === "string"
    ? body.assignedReviewerId
    : body?.assignedReviewerId === null
      ? null
      : undefined;
  const reviewDueAt = toIsoOrNull(body?.reviewDueAt);

  if (status && !allowedStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid submission status." }, { status: 400 });
  }

  if (body?.reviewDueAt !== undefined && reviewDueAt === undefined) {
    return NextResponse.json({ error: "Invalid review due time." }, { status: 400 });
  }

  if (status === "Approved") {
    for (const id of ids) {
      const target = submissionMap.get(id);
      if (!target) {
        continue;
      }

      const rpcArgs: Database["public"]["Functions"]["approve_submission"]["Args"] = {
        submission_id_input: id,
        reviewer_id_input: reviewerId,
        review_notes_input: notes ?? null,
      };

      const { data: approvedBeforeRows } = await admin
        .from("submissions")
        .select("reward_coins")
        .eq("user_id", target.user_id)
        .eq("status", "Approved");
      const approvedExpBefore = (approvedBeforeRows ?? []).reduce((sum, item) => sum + Math.max(item.reward_coins ?? 0, 0), 0);

      const { error } = await admin.rpc("approve_submission", rpcArgs);
      if (error) {
        await createAppLog({
          level: "error",
          category: "admin_review",
          event: "bulk_approve_failed",
          message: error.message,
          route: "/api/admin/submissions/bulk",
          userId: reviewerId,
          context: { failedId: id },
        });
        return NextResponse.json({ error: error.message, failedId: id }, { status: 400 });
      }

      const settleArgs: Database["public"]["Functions"]["settle_referral_reward"]["Args"] = {
        approved_submission_id_input: id,
      };
      const { data: settleResult } = await admin.rpc("settle_referral_reward", settleArgs);

      await createUserNotification({
        userId: target.user_id,
        type: "submission_approved",
        title: "Mission approved",
        message: `Your submission for \"${target.mission_title}\" was approved. +${target.reward_coins} Coins credited.`,
        link: "/dashboard",
        metadata: {
          submissionId: id,
          missionTitle: target.mission_title,
          rewardCoins: target.reward_coins,
        },
      });

      const settlePayload = (settleResult ?? null) as {
        settled?: boolean;
        rewardCoins?: number;
        inviterUserId?: string;
        invitedUserId?: string;
        submissionId?: string;
      } | null;

      if (settlePayload) {
        settlePayload.submissionId = id;
      }

      if (settlePayload?.settled && settlePayload.inviterUserId) {
        await createUserNotification({
          userId: settlePayload.inviterUserId,
          type: "referral_reward",
          title: "Referral reward credited",
          message: `Your referral has qualified. +${settlePayload.rewardCoins ?? 0} Coins added to your balance.`,
          link: "/dashboard",
          metadata: {
            submissionId: id,
            inviterUserId: settlePayload.inviterUserId,
            invitedUserId: settlePayload.invitedUserId ?? target.user_id,
            rewardCoins: settlePayload.rewardCoins ?? 0,
          },
        });
      }

      await handleReferralPostSettlement({
        admin,
        settlePayload,
      });

      const approvedExpAfter = approvedExpBefore + Math.max(target.reward_coins ?? 0, 0);
      const levelUpRewards = await awardGamePassLevelUpRewards({
        admin,
        userId: target.user_id,
        submissionId: id,
        previousExp: approvedExpBefore,
        nextExp: approvedExpAfter,
      });

      if (levelUpRewards.length > 0) {
        const totalBonusCoins = levelUpRewards.reduce((sum, item) => sum + item.coins, 0);
        const levelSummary = levelUpRewards.map((item) => `Lv.${item.level}`).join(", ");

        await createUserNotification({
          userId: target.user_id,
          type: "level_up_reward",
          title: "Game Pass level up!",
          message: `You reached ${levelSummary}. +${totalBonusCoins} bonus Coins credited.`,
          link: "/dashboard",
          metadata: {
            submissionId: id,
            totalBonusCoins,
            levels: levelUpRewards.map((item) => item.level),
          },
        });
      }

      if (assignedReviewerId !== undefined || reviewDueAt !== undefined) {
        const assignmentPayload: Database["public"]["Tables"]["submissions"]["Update"] = {
          assigned_reviewer_id: assignedReviewerId,
          review_due_at: reviewDueAt,
        };
        await admin.from("submissions").update(assignmentPayload).eq("id", id);
      }

      await createAppLog({
        level: "info",
        category: "funnel",
        event: "funnel.submission_approved",
        route: "/api/admin/submissions/bulk",
        userId: reviewerId,
        context: {
          submissionId: id,
          creatorUserId: target.user_id,
          bulk: true,
        },
      });
    }

    await syncSlaBreachForIds(admin, ids);

    await createAppLog({
      level: "info",
      category: "admin_review",
      event: "bulk_submissions_approved",
      route: "/api/admin/submissions/bulk",
      userId: reviewerId,
      context: { count: ids.length },
    });

    return NextResponse.json({ ok: true, updatedCount: ids.length });
  }

  const payload: Database["public"]["Tables"]["submissions"]["Update"] = {
    assigned_reviewer_id: assignedReviewerId,
    review_due_at: reviewDueAt,
  };

  if (status) {
    payload.status = status;
    payload.reviewed_at = new Date().toISOString();
    payload.reviewed_by = reviewerId;
  }

  if (notes !== undefined) {
    payload.notes = notes || null;
  }

  const { error } = await admin.from("submissions").update(payload).in("id", ids);
  if (error) {
    await createAppLog({
      level: "error",
      category: "admin_review",
      event: "bulk_update_failed",
      message: error.message,
      route: "/api/admin/submissions/bulk",
      userId: reviewerId,
      context: { count: ids.length, status: status ?? null },
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await syncSlaBreachForIds(admin, ids);

  if (status === "Needs edits") {
    for (const id of ids) {
      const target = submissionMap.get(id);
      if (!target) {
        continue;
      }

      await createUserNotification({
        userId: target.user_id,
        type: "submission_needs_edits",
        title: "Submission needs edits",
        message: `Your submission for \"${target.mission_title}\" needs revisions. Check reviewer notes and resubmit.`,
        link: "/dashboard",
        metadata: {
          submissionId: id,
          missionTitle: target.mission_title,
        },
      });
    }
  }

  await createAppLog({
    level: "info",
    category: "admin_review",
    event: "bulk_submissions_updated",
    route: "/api/admin/submissions/bulk",
    userId: reviewerId,
    context: { count: ids.length, status: status ?? null },
  });

  return NextResponse.json({ ok: true, updatedCount: ids.length });
}
