import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSeasonRange(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0));
  const seasonKey = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  return { start: start.toISOString(), end: end.toISOString(), seasonKey };
}

export async function GET() {
  const [supabase, admin] = await Promise.all([
    createSupabaseServerClient(),
    Promise.resolve(createSupabaseAdminClient()),
  ]);

  if (!supabase || !admin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { start, end, seasonKey } = getSeasonRange();

  const { data: referrals } = await admin
    .from("referrals")
    .select("inviter_user_id")
    .eq("status", "Rewarded")
    .gte("rewarded_at", start)
    .lt("rewarded_at", end);

  const counts = new Map<string, number>();
  for (const row of referrals ?? []) {
    counts.set(row.inviter_user_id, (counts.get(row.inviter_user_id) ?? 0) + 1);
  }

  const ranked = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([userId, rewardedInvites], index) => ({ rank: index + 1, userId, rewardedInvites }));

  const userIds = ranked.map((item) => item.userId);
  const { data: profiles } = userIds.length > 0
    ? await admin.from("profiles").select("id, full_name, instagram_handle, public_user_id").in("id", userIds)
    : { data: [] as Array<{ id: string; full_name: string | null; instagram_handle: string | null; public_user_id: string }> };

  const profileMap = new Map((profiles ?? []).map((item) => [item.id, item]));

  const leaderboard = ranked.map((item) => {
    const profile = profileMap.get(item.userId);
    return {
      rank: item.rank,
      name: profile?.full_name || profile?.instagram_handle || profile?.public_user_id || `USR-${item.userId.slice(0, 8).toUpperCase()}`,
      rewardedInvites: item.rewardedInvites,
    };
  });

  return NextResponse.json({ seasonKey, leaderboard });
}
