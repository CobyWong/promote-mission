import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";
import { getReferralHistory } from "@/lib/backend";

export async function GET(request: Request) {
  const isZh = isZhRequest(request);
  const result = await getReferralHistory();

  if (!result.isAuthenticated) {
    return NextResponse.json({ error: isZh ? "請先登入後再查看推薦紀錄。" : "Authentication required." }, { status: 401 });
  }

  return NextResponse.json(result.items);
}
