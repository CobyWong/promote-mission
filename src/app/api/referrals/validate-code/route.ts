import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function normalizeReferralCode(raw: string | null) {
  return (raw ?? "").trim().toUpperCase();
}

export async function GET(request: Request) {
  const isZh = isZhRequest(request);
  const admin = createSupabaseAdminClient();

  if (!admin) {
    return NextResponse.json(
      { error: isZh ? "推薦碼驗證服務暫時不可用。" : "Referral validation service is unavailable." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const code = normalizeReferralCode(url.searchParams.get("code"));

  if (!code) {
    return NextResponse.json({ valid: false }, { status: 200 });
  }

  const { data, error } = await admin
    .from("referral_profiles")
    .select("referral_code")
    .eq("referral_code", code)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: isZh ? "驗證推薦碼失敗，請稍後再試。" : error.message }, { status: 400 });
  }

  return NextResponse.json({ valid: Boolean(data?.referral_code), code }, { status: 200 });
}