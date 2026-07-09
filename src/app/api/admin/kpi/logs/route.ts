import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import { isZhRequest } from "@/lib/api-locale";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const isZh = isZhRequest(request);
  const [supabase, admin] = await Promise.all([
    createSupabaseServerClient(),
    Promise.resolve(createSupabaseAdminClient()),
  ]);

  if (!supabase || !admin) {
    return NextResponse.json({ error: isZh ? "系統日誌服務暫時不可用，請稍後再試。" : "Supabase admin mode is not configured." }, { status: 503 });
  }

  const [adminSession, {
    data: { user },
  }] = await Promise.all([hasAdminSession(), supabase.auth.getUser()]);

  if (!adminSession && (!user || !isAdminEmail(user.email))) {
    return NextResponse.json({ error: isZh ? "需要管理員權限。" : "Admin access required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const level = (searchParams.get("level") ?? "error").toLowerCase();
  const eventSuffix = (searchParams.get("eventSuffix") ?? "").trim();
  const limitValue = Number(searchParams.get("limit") ?? "20");
  const limit = Number.isNaN(limitValue) ? 20 : Math.min(Math.max(limitValue, 1), 100);

  let query = admin
    .from("app_logs")
    .select("id, level, category, event, message, route, request_id, user_id, context, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (eventSuffix) {
    query = query.like("event", `%${eventSuffix}`);
  }

  const { data, error } = await (level === "all" ? query : query.eq("level", level));

  if (error) {
    return NextResponse.json({ error: isZh ? "查詢系統日誌失敗，請稍後再試。" : error.message }, { status: 400 });
  }

  return NextResponse.json({
    logs: data ?? [],
  });
}
