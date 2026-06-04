import { cookies } from "next/headers";

import { ADMIN_SESSION_COOKIE, hasAdminSessionCookieValue } from "@/lib/admin-auth";

export async function hasAdminSession() {
  const cookieStore = await cookies();
  return hasAdminSessionCookieValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}
