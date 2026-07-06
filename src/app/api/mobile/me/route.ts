import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";

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

  const [{ data: profile }, { data: transactions }, { data: submissions }] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, instagram_handle, niche, followers_range")
      .eq("id", user.id)
      .maybeSingle(),
    admin
      .from("coin_transactions")
      .select("amount")
      .eq("user_id", user.id),
    admin
      .from("submissions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "Approved"),
  ]);

  const balance = (transactions ?? []).reduce((sum, item) => sum + (item.amount ?? 0), 0);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? null,
      fullName: profile?.full_name ?? null,
      instagramHandle: profile?.instagram_handle ?? null,
      niche: profile?.niche ?? null,
      followersRange: profile?.followers_range ?? null,
      balance,
      approvedMissionCount: (submissions ?? []).length,
    },
  });
}