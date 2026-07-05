import { NextResponse } from "next/server";

import { getReferralHistory } from "@/lib/backend";

export async function GET() {
  const result = await getReferralHistory();

  if (!result.isAuthenticated) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  return NextResponse.json(result.items);
}
