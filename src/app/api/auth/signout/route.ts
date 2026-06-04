import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
}

export async function GET(request: Request) {
  await signOut();
  return NextResponse.redirect(new URL("/", request.url));
}

export async function POST() {
  await signOut();

  return NextResponse.json({ ok: true });
}
