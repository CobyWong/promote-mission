import type { Json } from "@/lib/supabase/database.types";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type NotificationType =
  | "submission_approved"
  | "submission_needs_edits"
  | "redemption_requested"
  | "redemption_fulfilled"
  | "redemption_rejected"
  | "referral_reward"
  | "system";

export async function createUserNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Json;
}) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return;
  }

  const payload: Database["public"]["Tables"]["notifications"]["Insert"] = {
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link ?? null,
    metadata: input.metadata ?? {},
    delivery_status: "in_app",
    is_read: false,
  };

  await admin.from("notifications").insert(payload);
}
