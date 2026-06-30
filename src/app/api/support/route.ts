import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupportEmail } from "@/lib/supabase/env";

function sanitizeInput(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const name = sanitizeInput(body.name, 120);
  const email = sanitizeInput(body.email, 160).toLowerCase();
  const category = sanitizeInput(body.category, 40) || "General";
  const message = sanitizeInput(body.message, 2000);
  const pagePath = sanitizeInput(body.pagePath, 180) || null;

  if (!name) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  if (message.length < 10) {
    return NextResponse.json({ error: "Please describe the issue in at least 10 characters." }, { status: 400 });
  }

  const supportEmail = getSupportEmail();
  const admin = createSupabaseAdminClient();

  if (!admin) {
    return NextResponse.json(
      {
        error: "Support inbox is temporarily unavailable.",
        supportEmail,
      },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  const payload = {
    user_id: user?.id ?? null,
    name,
    email,
    category,
    message,
    page_path: pagePath,
    status: "open",
  };

  const { data, error } = await admin
    .from("support_tickets")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: "Failed to send support request right now.",
        supportEmail,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      ticketId: (data as { id: string }).id,
      supportEmail,
    },
    { status: 201 },
  );
}
