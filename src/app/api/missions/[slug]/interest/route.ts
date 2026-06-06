import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminConfig, hasSupabaseConfig } from "@/lib/supabase/env";

export async function POST(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  if (!hasSupabaseConfig() || !hasSupabaseAdminConfig()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const { slug } = await context.params;

  const { data: mission } = await admin
    .from("missions")
    .select("current_participants")
    .eq("slug", slug)
    .single();

  const nextCount = (mission?.current_participants ?? 0) + 1;

  const { error } = await admin
    .from("missions")
    .update({ current_participants: nextCount })
    .eq("slug", slug);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, count: nextCount });
}
