import { NextResponse } from "next/server";

import { createAppLog } from "@/lib/observability";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(_request: Request, context: { params: Promise<{ id: string }> }) {
  const [{ id }, supabase] = await Promise.all([
    context.params,
    createSupabaseServerClient(),
  ]);

  if (!supabase) {
    await createAppLog({
      level: "error",
      category: "notifications",
      event: "notification_mark_unavailable",
      message: "Supabase is not configured.",
      route: "/api/notifications/[id]",
      context: { notificationId: id },
    });
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await createAppLog({
      level: "warn",
      category: "auth",
      event: "notification_mark_unauthenticated",
      message: "Authentication required.",
      route: "/api/notifications/[id]",
      context: { notificationId: id },
    });
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    await createAppLog({
      level: "error",
      category: "notifications",
      event: "notification_mark_failed",
      message: error.message,
      route: "/api/notifications/[id]",
      userId: user.id,
      context: { notificationId: id },
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
