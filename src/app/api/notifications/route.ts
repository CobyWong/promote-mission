import { NextResponse } from "next/server";

import { isZhRequest } from "@/lib/api-locale";
import { createAppLog } from "@/lib/observability";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const isZh = isZhRequest(request);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    await createAppLog({
      level: "error",
      category: "notifications",
      event: "notifications_unavailable",
      message: "Supabase is not configured.",
      route: "/api/notifications",
    });
    return NextResponse.json({ error: isZh ? "通知服務暫時不可用，請稍後再試。" : "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await createAppLog({
      level: "warn",
      category: "auth",
      event: "notifications_unauthenticated",
      message: "Authentication required.",
      route: "/api/notifications",
    });
    return NextResponse.json({ error: isZh ? "請先登入後再查看通知。" : "Authentication required." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, message, link, metadata, is_read, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    await createAppLog({
      level: "error",
      category: "notifications",
      event: "notifications_fetch_failed",
      message: error.message,
      route: "/api/notifications",
      userId: user.id,
    });
    return NextResponse.json({ error: isZh ? "載入通知失敗，請稍後再試。" : error.message }, { status: 400 });
  }

  const notifications = (data ?? []).map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    message: item.message,
    link: item.link,
    metadata: item.metadata,
    isRead: item.is_read,
    readAt: item.read_at,
    createdAt: item.created_at,
  }));

  return NextResponse.json({
    notifications,
    unreadCount: notifications.filter((item) => !item.isRead).length,
  });
}

export async function PATCH(request: Request) {
  const isZh = isZhRequest(request);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: isZh ? "通知服務暫時不可用，請稍後再試。" : "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: isZh ? "請先登入後再操作通知。" : "Authentication required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { markAllRead?: boolean } | null;
  if (!body?.markAllRead) {
    return NextResponse.json({ error: isZh ? "請提供 markAllRead 參數。" : "markAllRead is required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    await createAppLog({
      level: "error",
      category: "notifications",
      event: "notifications_mark_all_failed",
      message: error.message,
      route: "/api/notifications",
      userId: user.id,
    });
    return NextResponse.json({ error: isZh ? "更新通知狀態失敗，請稍後再試。" : error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
