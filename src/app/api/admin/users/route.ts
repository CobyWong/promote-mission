import { NextResponse } from "next/server";

import { getAdminUsersData } from "@/lib/backend";

export async function GET() {
  const usersData = await getAdminUsersData();

  if (usersData.mode === "unavailable") {
    return NextResponse.json({ error: "Supabase admin mode is not configured." }, { status: 503 });
  }

  if (!usersData.authorized) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  return NextResponse.json({ users: usersData.users });
}
