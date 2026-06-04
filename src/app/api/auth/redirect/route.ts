import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getPublicOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? request.headers.get("host");

  if (host) {
    const protocol = forwardedProto ?? "https";
    return `${protocol}://${host}`;
  }

  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const origin = getPublicOrigin(request);

  if (!supabase) {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  // Check if user is admin
  if (isAdminEmail(user.email)) {
    return NextResponse.redirect(new URL("/admin/reviews", origin));
  }

  // Regular creator
  return NextResponse.redirect(new URL("/dashboard", origin));
}
