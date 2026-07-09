export type MobileAppEnvironment = "development" | "staging" | "production";

const FALLBACK_API_BASE_URL = "http://localhost:3000";

function normalizeEnvironment(raw: string | undefined): MobileAppEnvironment {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "staging") {
    return "staging";
  }

  if (value === "production") {
    return "production";
  }

  return "development";
}

function normalizeBaseUrl(raw: string | undefined) {
  const value = (raw ?? "").trim();
  const resolved = value.length > 0 ? value : FALLBACK_API_BASE_URL;
  return resolved.replace(/\/+$/, "");
}

const appEnvironment = normalizeEnvironment(process.env.EXPO_PUBLIC_APP_ENV);
const apiBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

export const mobileConfig = {
  appEnvironment,
  apiBaseUrl,
  supabaseUrl,
  supabaseAnonKey,
};

export const hasSupabaseMobileConfig = Boolean(supabaseUrl && supabaseAnonKey);
