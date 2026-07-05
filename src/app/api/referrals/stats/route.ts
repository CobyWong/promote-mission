import { NextResponse } from "next/server";

import { getReferralStats } from "@/lib/backend";

export async function GET() {
  const result = await getReferralStats();

  if (!result.isAuthenticated) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  return NextResponse.json(result.stats);
}
