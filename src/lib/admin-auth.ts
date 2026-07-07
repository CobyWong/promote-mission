import { getAdminEmails, getAdminPassword, hasAdminPasswordConfig } from "@/lib/supabase/env";

export const ADMIN_SESSION_COOKIE = "pm_admin_session";
const ADMIN_SESSION_VALUE = "active";

export function isAdminCredential(email: string, password: string) {
  if (!hasAdminPasswordConfig()) {
    return false;
  }

  return getAdminEmails().includes(email.trim().toLowerCase()) && password === getAdminPassword();
}

export function hasAdminCredentialConfig() {
  return hasAdminPasswordConfig() && getAdminEmails().length > 0;
}

export function getAdminSessionCookieValue() {
  return ADMIN_SESSION_VALUE;
}

export function hasAdminSessionCookieValue(value?: string | null) {
  return value === ADMIN_SESSION_VALUE;
}
