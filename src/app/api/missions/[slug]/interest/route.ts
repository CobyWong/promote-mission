import { NextResponse } from "next/server";

import { createAppLog } from "@/lib/observability";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminConfig, hasSupabaseConfig } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  if (!hasSupabaseConfig() || !hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Mission interest service unavailable." }, { status: 503 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Mission interest service unavailable." }, { status: 503 });
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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  await createAppLog({
    level: "info",
    category: "funnel",
    event: "funnel.mission_accepted",
    route: "/api/missions/[slug]/interest",
    userId: user?.id ?? null,
    context: {
      missionSlug: slug,
      method: request.method,
      channel: "web",
      participantsAfter: nextCount,
    },
  });

  return NextResponse.json({ ok: true, count: nextCount });
}
