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

function normalizeTelemetryEnabled(raw: string | undefined, appEnvironment: MobileAppEnvironment) {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "1" || value === "true" || value === "yes" || value === "on") {
    return true;
  }

  if (value === "0" || value === "false" || value === "no" || value === "off") {
    return false;
  }

  return appEnvironment !== "development";
}

function normalizeSamplingRate(raw: string | undefined, fallbackValue: number) {
  const parsed = Number.parseFloat((raw ?? "").trim());
  if (Number.isNaN(parsed)) {
    return fallbackValue;
  }

  return Math.max(0, Math.min(1, parsed));
}

const appEnvironment = normalizeEnvironment(process.env.EXPO_PUBLIC_APP_ENV);
const apiBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const telemetryEnabled = normalizeTelemetryEnabled(process.env.EXPO_PUBLIC_TELEMETRY_ENABLED, appEnvironment);
const telemetryEndpoint = (process.env.EXPO_PUBLIC_MOBILE_TELEMETRY_ENDPOINT ?? "").trim();
const telemetryErrorSampleRate = normalizeSamplingRate(process.env.EXPO_PUBLIC_TELEMETRY_ERROR_SAMPLE_RATE, 1);
const telemetryPerfSampleRate = normalizeSamplingRate(process.env.EXPO_PUBLIC_TELEMETRY_PERF_SAMPLE_RATE, 0.3);

export const mobileConfig = {
  appEnvironment,
  apiBaseUrl,
  supabaseUrl,
  supabaseAnonKey,
  telemetryEnabled,
  telemetryEndpoint,
  telemetryErrorSampleRate,
  telemetryPerfSampleRate,
};

export const hasSupabaseMobileConfig = Boolean(supabaseUrl && supabaseAnonKey);
