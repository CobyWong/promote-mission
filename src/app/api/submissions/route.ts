import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";

export async function POST(request: Request) {
  const isZh = isZhRequest(request);
  return NextResponse.json(
    {
      error: isZh
        ? "已改為 missionone_hk 系統同步自動提交，無需手動提交 Proof。"
        : "Manual proof submission is disabled. Submissions are created automatically from missionone_hk system sync.",
    },
    { status: 410 },
  );
}
