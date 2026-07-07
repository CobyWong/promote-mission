import type { Json } from "@/lib/supabase/database.types";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getErrorMonitorWebhookUrl } from "@/lib/supabase/env";

type LogLevel = "debug" | "info" | "warn" | "error";

export async function createAppLog(input: {
  level: LogLevel;
  category: string;
  event: string;
  message?: string | null;
  route?: string | null;
  requestId?: string | null;
  userId?: string | null;
  context?: Json;
}) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return;
  }

  const payload: Database["public"]["Tables"]["app_logs"]["Insert"] = {
    level: input.level,
    category: input.category,
    event: input.event,
    message: input.message ?? null,
    route: input.route ?? null,
    request_id: input.requestId ?? null,
    user_id: input.userId ?? null,
    context: input.context ?? {},
  };

  await admin.from("app_logs").insert(payload);
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const firstForwarded = forwarded.split(",")[0]?.trim();
  if (firstForwarded) {
    return firstForwarded;
  }

  return request.headers.get("x-real-ip") ?? null;
}

function toJsonSafe(value: unknown): Json {
  try {
    if (value === undefined) {
      return {};
    }

    return JSON.parse(JSON.stringify(value)) as Json;
  } catch {
    return {
      unserializable: true,
    };
  }
}

export async function logApiEvent(input: {
  level: LogLevel;
  route: string;
  event: string;
  request: Request;
  requestId: string;
  userId?: string | null;
  message?: string | null;
  context?: Record<string, unknown>;
}) {
  const logContext = {
    method: input.request.method,
    path: new URL(input.request.url).pathname,
    ip: getClientIp(input.request),
    userAgent: input.request.headers.get("user-agent") ?? null,
    ...input.context,
  };

  await createAppLog({
    level: input.level,
    category: "api",
    event: input.event,
    message: input.message ?? null,
    route: input.route,
    requestId: input.requestId,
    userId: input.userId ?? null,
    context: toJsonSafe(logContext),
  });

  const consolePayload = {
    level: input.level,
    category: "api",
    event: input.event,
    route: input.route,
    requestId: input.requestId,
    userId: input.userId ?? null,
    context: logContext,
    message: input.message ?? null,
  };

  const printer = input.level === "error" ? console.error : input.level === "warn" ? console.warn : console.info;
  printer(JSON.stringify(consolePayload));
}

export async function reportApiError(input: {
  route: string;
  request: Request;
  requestId: string;
  userId?: string | null;
  error: unknown;
  context?: Record<string, unknown>;
}) {
  const errorMessage = input.error instanceof Error ? input.error.message : String(input.error);
  const errorStack = input.error instanceof Error ? input.error.stack : null;

  await logApiEvent({
    level: "error",
    route: input.route,
    event: "api.error",
    request: input.request,
    requestId: input.requestId,
    userId: input.userId ?? null,
    message: errorMessage,
    context: {
      ...input.context,
      stack: errorStack,
    },
  });

  const webhook = getErrorMonitorWebhookUrl();
  if (!webhook) {
    return;
  }

  try {
    await fetch(webhook, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        level: "error",
        route: input.route,
        requestId: input.requestId,
        userId: input.userId ?? null,
        message: errorMessage,
        stack: errorStack,
        context: input.context ?? {},
      }),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // Do not throw from observability path.
  }
}
