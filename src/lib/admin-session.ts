import { cookies } from "next/headers";

import { ADMIN_SESSION_COOKIE, hasAdminSessionCookieValue } from "@/lib/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/supabase/env";

export async function hasAdminSession() {
  const cookieStore = await cookies();
  if (!hasAdminSessionCookieValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    return false;
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return false;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return Boolean(user && isAdminEmail(user.email));
}
