import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envExamplePath = path.join(root, ".env.example");

if (!fs.existsSync(envExamplePath)) {
  console.error("Missing .env.example");
  process.exit(1);
}

const requiredKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_EMAILS",
  "ADMIN_PASSWORD",
  "BRAND_EMAILS",
  "NEXT_PUBLIC_APP_URL",
  "INSTAGRAM_REDIRECT_URI",
  "META_APP_ID",
  "META_APP_SECRET",
  "ERROR_MONITOR_WEBHOOK_URL",
  "RATE_LIMIT_SALT",
];

const fileContent = fs.readFileSync(envExamplePath, "utf8");
const lines = fileContent
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

const parsed = new Map();
for (const line of lines) {
  const separator = line.indexOf("=");
  if (separator <= 0) {
    continue;
  }

  const key = line.slice(0, separator).trim();
  const value = line.slice(separator + 1).trim();
  parsed.set(key, value);
}

const missingKeys = requiredKeys.filter((key) => !parsed.has(key));
if (missingKeys.length > 0) {
  console.error(`.env.example is missing required keys: ${missingKeys.join(", ")}`);
  process.exit(1);
}

const disallowedPatterns = [
  /sb_secret_/i,
  /sb_publishable_/i,
  /-----BEGIN /,
  /AIza[0-9A-Za-z_-]{35}/,
  /ghp_[0-9A-Za-z]{36}/,
];

const leakedValues = [];
for (const [key, value] of parsed.entries()) {
  if (!value) {
    continue;
  }

  if (disallowedPatterns.some((pattern) => pattern.test(value))) {
    leakedValues.push(key);
  }
}

if (leakedValues.length > 0) {
  console.error(`.env.example contains real or sensitive-looking values for: ${leakedValues.join(", ")}`);
  process.exit(1);
}

const placeholderRules = [
  ["NEXT_PUBLIC_SUPABASE_URL", "https://your-project-ref.supabase.co"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "your-supabase-anon-key"],
  ["SUPABASE_SERVICE_ROLE_KEY", "your-supabase-service-role-key"],
  ["ADMIN_PASSWORD", "change-this-admin-password"],
  ["RATE_LIMIT_SALT", "change-this-rate-limit-salt"],
];

const invalidPlaceholders = [];
for (const [key, expected] of placeholderRules) {
  const value = parsed.get(key);
  if (value !== expected) {
    invalidPlaceholders.push(`${key}=${expected}`);
  }
}

if (invalidPlaceholders.length > 0) {
  console.error(".env.example must keep safe placeholders for key secrets:");
  invalidPlaceholders.forEach((line) => console.error(`- ${line}`));
  process.exit(1);
}

const upstashUrl = parsed.get("UPSTASH_REDIS_REST_URL") ?? "";
const upstashToken = parsed.get("UPSTASH_REDIS_REST_TOKEN") ?? "";
if ((upstashUrl && !upstashToken) || (!upstashUrl && upstashToken)) {
  console.error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured together (or both left empty).");
  process.exit(1);
}

console.log("Environment template checks passed.");
