import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/admin-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function escapeCsv(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = typeof value === "string" ? value : JSON.stringify(value);
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET(request: Request) {
  const [supabase, admin] = await Promise.all([
    createSupabaseServerClient(),
    Promise.resolve(createSupabaseAdminClient()),
  ]);

  if (!supabase || !admin) {
    return NextResponse.json({ error: "Supabase admin mode is not configured." }, { status: 503 });
  }

  const [adminSession, {
    data: { user },
  }] = await Promise.all([hasAdminSession(), supabase.auth.getUser()]);

  if (!adminSession && (!user || !isAdminEmail(user.email))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const level = (searchParams.get("level") ?? "all").toLowerCase();
  const category = searchParams.get("category");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limitRaw = Number(searchParams.get("limit") ?? "1000");
  const limit = Number.isNaN(limitRaw) ? 1000 : Math.min(Math.max(limitRaw, 1), 5000);

  let query = admin
    .from("app_logs")
    .select("id, level, category, event, message, route, request_id, user_id, context, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (level !== "all") {
    query = query.eq("level", level);
  }

  if (category) {
    query = query.eq("category", category);
  }

  if (from) {
    query = query.gte("created_at", from);
  }

  if (to) {
    query = query.lte("created_at", to);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = data ?? [];
  const header = ["id", "created_at", "level", "category", "event", "message", "route", "request_id", "user_id", "context"];
  const csvLines = [header.join(",")];

  for (const row of rows) {
    csvLines.push([
      escapeCsv(row.id),
      escapeCsv(row.created_at),
      escapeCsv(row.level),
      escapeCsv(row.category),
      escapeCsv(row.event),
      escapeCsv(row.message),
      escapeCsv(row.route),
      escapeCsv(row.request_id),
      escapeCsv(row.user_id),
      escapeCsv(row.context),
    ].join(","));
  }

  const csv = csvLines.join("\n");
  const fileName = `app-logs-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
