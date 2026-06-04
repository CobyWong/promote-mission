import { getAdminEmails } from "@/lib/supabase/env";

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";
export const ADMIN_SESSION_COOKIE = "pm_admin_session";
const ADMIN_SESSION_VALUE = "active";

export function isAdminCredential(email: string, password: string) {
  return getAdminEmails().includes(email.trim().toLowerCase()) && password === ADMIN_PASSWORD;
}

export function getAdminSessionCookieValue() {
  return ADMIN_SESSION_VALUE;
}

export function hasAdminSessionCookieValue(value?: string | null) {
  return value === ADMIN_SESSION_VALUE;
}
