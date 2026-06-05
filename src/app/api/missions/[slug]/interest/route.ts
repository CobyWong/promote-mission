import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminConfig, hasSupabaseConfig } from "@/lib/supabase/env";

export async function POST(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  // Demo mode: acknowledge without DB write
  if (!hasSupabaseConfig() || !hasSupabaseAdminConfig()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const { slug } = await context.params;
  const admin = createSupabaseAdminClient();

  if (!admin) {
    return NextResponse.json({ ok: true, demo: true });
  }

  // Read current count then increment (simple; no deduplication in prototype)
  const { data: mission } = await admin
    .from("missions")
    .select("current_participants")
    .eq("slug", slug)
    .single();

  const newCount = (mission?.current_participants ?? 0) + 1;

  const { error } = await admin
    .from("missions")
    .update({ current_participants: newCount })
    .eq("slug", slug);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, count: newCount });
}
