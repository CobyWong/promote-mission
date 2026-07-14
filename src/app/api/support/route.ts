import { NextResponse } from "next/server";

import { createAppLog } from "@/lib/observability";
import { isSameOriginMutationRequest } from "@/lib/csrf";
import { evaluateRateLimit, getClientFingerprint, getRetryAfterSeconds } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupportEmail } from "@/lib/supabase/env";
import { isZhRequest } from "@/lib/api-locale";

function sanitizeInput(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const isZh = isZhRequest(request);
  const t = {
    csrfFailed: isZh ? "來源驗證失敗，請重新整理後再試。" : "Request origin verification failed.",
    tooManyRequests: isZh ? "請求次數過於頻繁，請稍後再試。" : "Too many requests. Please try again later.",
    invalidPayload: isZh ? "請求內容格式無效。" : "Invalid payload.",
    nameRequired: isZh ? "請填寫稱呼。" : "Please enter your name.",
    invalidEmail: isZh ? "請輸入有效的電郵地址。" : "Please enter a valid email.",
    messageTooShort: isZh ? "請至少以 10 個字描述問題。" : "Please describe the issue in at least 10 characters.",
    inboxUnavailable: isZh ? "客服系統暫時不可用，請稍後再試。" : "Support inbox is temporarily unavailable.",
    sendFailed: isZh ? "目前無法送出客服請求，請稍後再試。" : "Failed to send support request right now.",
  };

  if (!isSameOriginMutationRequest(request)) {
    return NextResponse.json({ error: t.csrfFailed }, { status: 403 });
  }

  const limiter = await evaluateRateLimit({
    namespace: "support-ticket-create",
    key: getClientFingerprint(request),
    max: 8,
    windowMs: 10 * 60 * 1000,
  });

  if (!limiter.allowed) {
    const retryAfter = getRetryAfterSeconds(limiter.resetAt);
    return NextResponse.json(
      { error: t.tooManyRequests },
      {
        status: 429,
        headers: {
          "retry-after": String(retryAfter),
        },
      },
    );
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    await createAppLog({
      level: "warn",
      category: "support",
      event: "support_invalid_payload",
      message: "Invalid payload.",
      route: "/api/support",
    });
    return NextResponse.json({ error: t.invalidPayload }, { status: 400 });
  }

  const name = sanitizeInput(body.name, 120);
  const email = sanitizeInput(body.email, 160).toLowerCase();
  const category = sanitizeInput(body.category, 40) || "General";
  const message = sanitizeInput(body.message, 2000);
  const pagePath = sanitizeInput(body.pagePath, 180) || null;

  if (!name) {
    return NextResponse.json({ error: t.nameRequired }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: t.invalidEmail }, { status: 400 });
  }

  if (message.length < 10) {
    return NextResponse.json({ error: t.messageTooShort }, { status: 400 });
  }

  const supportEmail = getSupportEmail();
  const admin = createSupabaseAdminClient();

  if (!admin) {
    await createAppLog({
      level: "error",
      category: "support",
      event: "support_unavailable",
      message: "Support inbox is temporarily unavailable.",
      route: "/api/support",
      context: { email },
    });
    return NextResponse.json(
      {
        error: t.inboxUnavailable,
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
    await createAppLog({
      level: "error",
      category: "support",
      event: "support_ticket_insert_failed",
      message: error.message,
      route: "/api/support",
      userId: user?.id ?? null,
      context: { email, category },
    });
    return NextResponse.json(
      {
        error: t.sendFailed,
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
