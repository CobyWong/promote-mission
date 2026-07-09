import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";
import { getAdminUsersData } from "@/lib/backend";

export async function GET(request: Request) {
  const isZh = isZhRequest(request);
  const usersData = await getAdminUsersData();

  if (usersData.mode === "unavailable") {
    return NextResponse.json({ error: isZh ? "管理員使用者服務暫時不可用，請稍後再試。" : "Supabase admin mode is not configured." }, { status: 503 });
  }

  if (!usersData.authorized) {
    return NextResponse.json({ error: isZh ? "需要管理員權限。" : "Admin access required." }, { status: 403 });
  }

  return NextResponse.json({ users: usersData.users });
}
