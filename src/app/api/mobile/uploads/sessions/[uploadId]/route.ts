import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";

export async function GET(request: Request) {
  const isZh = isZhRequest(request);

  return NextResponse.json(
    {
      error: isZh
        ? "已改為 missionone_hk 系統同步自動提交，Mobile 端不再支援手動上傳工作階段查詢。"
        : "Manual upload sessions are disabled. Mission submissions are created automatically from missionone_hk system sync.",
    },
    { status: 410 },
  );
}
