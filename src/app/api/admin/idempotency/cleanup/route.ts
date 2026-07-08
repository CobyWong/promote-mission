import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getCleanupCronToken,
  hasCleanupCronToken,
  hasSupabaseConfig,
} from "@/lib/supabase/env";

function parseRetentionDays(raw: string | null): number {
  if (!raw) {
    return 7;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    return 7;
  }

  return Math.min(30, Math.max(1, parsed));
}

function computeCutoffIso(retentionDays: number): string {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  return cutoffDate.toISOString();
}

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      {
        removed: 0,
        skipped: true,
        reason: "SUPABASE_NOT_CONFIGURED",
      },
      { status: 200 },
    );
  }

  if (!hasCleanupCronToken()) {
    return NextResponse.json(
      {
        removed: 0,
        skipped: true,
        reason: "CLEANUP_CRON_TOKEN_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const expectedToken = getCleanupCronToken();
  const providedToken = request.headers.get("x-cron-token") ?? "";

  if (!providedToken || providedToken !== expectedToken) {
    return unauthorizedResponse();
  }

  const url = new URL(request.url);
  const retentionDays = parseRetentionDays(url.searchParams.get("retentionDays"));
  const cutoffIso = computeCutoffIso(retentionDays);

  const supabaseAdmin = createSupabaseAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        removed: 0,
        skipped: true,
        reason: "SUPABASE_ADMIN_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const table = (supabaseAdmin.from("idempotency_keys" as never) as unknown) as {
    delete: () => {
      lt: (column: string, value: string) => {
        select: (columns: string) => Promise<{ data: Array<{ storage_key?: string }> | null; error: { message: string } | null }>;
      };
    };
  };

  const { data, error } = await table
    .delete()
    .lt("expires_at", cutoffIso)
    .select("storage_key");

  if (error) {
    return NextResponse.json(
      {
        error: "Unable to cleanup idempotency keys.",
        detail: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      removed: data?.length ?? 0,
      retentionDays,
      cutoffIso,
      cleanedAt: new Date().toISOString(),
    },
    { status: 200 },
  );
}
