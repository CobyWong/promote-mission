import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const { data: profile } = await admin
    .from("referral_profiles")
    .select("referral_code")
    .eq("user_id", user.id)
    .maybeSingle();

  const referralCode = profile?.referral_code ?? "MISSIONON";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const inviteUrl = `${appUrl}/register?ref=${encodeURIComponent(referralCode)}`;

  return NextResponse.json({
    referralCode,
    inviteUrl,
    templates: {
      whatsapp: `Join Mission One with my referral code ${referralCode}: ${inviteUrl}`,
      telegram: `Join Mission One with my referral code ${referralCode}: ${inviteUrl}`,
      instagram: `Use my referral code ${referralCode} and start earning with missions today. ${inviteUrl}`,
    },
  });
}
