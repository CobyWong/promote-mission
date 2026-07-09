import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const isZh = isZhRequest(request);
  const [supabase, admin] = await Promise.all([
    createSupabaseServerClient(),
    Promise.resolve(createSupabaseAdminClient()),
  ]);

  if (!supabase || !admin) {
    return NextResponse.json({ error: isZh ? "分享工具暫時不可用，請稍後再試。" : "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: isZh ? "請先登入後再取得分享連結。" : "Authentication required." }, { status: 401 });
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
