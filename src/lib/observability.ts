import type { Json } from "@/lib/supabase/database.types";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
