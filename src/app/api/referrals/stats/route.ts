import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";
import { getReferralStats } from "@/lib/backend";

export async function GET(request: Request) {
  const isZh = isZhRequest(request);
  const result = await getReferralStats();

  if (!result.isAuthenticated) {
    return NextResponse.json({ error: isZh ? "請先登入後再查看推薦統計。" : "Authentication required." }, { status: 401 });
  }

  return NextResponse.json(result.stats);
}
