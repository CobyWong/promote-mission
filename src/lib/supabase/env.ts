const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
const supportWhatsappUrl = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_URL;

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function hasSupabaseAdminConfig() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export function getSupabaseUrl() {
  return supabaseUrl ?? "";
}

export function getSupabaseAnonKey() {
  return supabaseAnonKey ?? "";
}

export function getSupabaseServiceRoleKey() {
  return supabaseServiceRoleKey ?? "";
}

export function getAdminEmails() {
  const configured = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  // Keep backward compatibility with older seeded demo credentials.
  const legacy = ["admin@luck323.com"];

  return Array.from(new Set([...configured, ...legacy]));
}

export function getBrandEmails() {
  return (process.env.BRAND_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return getAdminEmails().includes(email.toLowerCase());
}

export function isBrandOrAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  const normalizedEmail = email.toLowerCase();
  return getAdminEmails().includes(normalizedEmail) || getBrandEmails().includes(normalizedEmail);
}

export function getSupportEmail() {
  return supportEmail?.trim() || "support@promotemission.com";
}

export function getSupportWhatsappUrl() {
  return supportWhatsappUrl?.trim() || null;
}
