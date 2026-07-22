import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envPath = ".env.local";
const envText = fs.readFileSync(envPath, "utf8");

function getEnv(text, key) {
  const m = text.match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1].trim() : "";
}

function upsert(text, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(text)) {
    return text.replace(re, line);
  }
  return `${text.endsWith("\n") ? text : `${text}\n`}${line}\n`;
}

function decodePayload(jwt) {
  const parts = jwt.split(".");
  if (parts.length < 2) return null;
  const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (b64.length % 4)) % 4;
  try {
    return JSON.parse(Buffer.from(b64 + "=".repeat(pad), "base64").toString("utf8"));
  } catch {
    return null;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || getEnv(envText, "NEXT_PUBLIC_SUPABASE_URL");
const newAnonKey = process.env.ROTATED_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.ROTATED_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
}
if (!newAnonKey) {
  throw new Error("Missing ROTATED_SUPABASE_ANON_KEY in shell env.");
}
if (!serviceRoleKey) {
  throw new Error("Missing ROTATED_SUPABASE_SERVICE_ROLE_KEY in shell env.");
}

const adminEmail = process.env.STAGING_ADMIN_EMAIL || getEnv(envText, "STAGING_ADMIN_EMAIL");
const adminPassword = process.env.STAGING_ADMIN_PASSWORD || getEnv(envText, "STAGING_ADMIN_PASSWORD");
if (!adminEmail || !adminPassword) {
  throw new Error("Missing STAGING_ADMIN_EMAIL or STAGING_ADMIN_PASSWORD.");
}

const e2eUserEmail = process.env.E2E_USER_EMAIL || getEnv(envText, "E2E_USER_EMAIL");
const e2eUserPassword = process.env.E2E_USER_PASSWORD || getEnv(envText, "E2E_USER_PASSWORD");

if (!e2eUserEmail || !e2eUserPassword) {
  throw new Error("Missing E2E_USER_EMAIL or E2E_USER_PASSWORD. Add them in .env.local before running this script.");
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
const publicClient = createClient(supabaseUrl, newAnonKey, { auth: { persistSession: false } });

async function signIn(email, password) {
  const { data, error } = await publicClient.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token || !data.session?.refresh_token) {
    throw new Error(`Sign-in failed for ${email}: ${error?.message || "unknown error"}`);
  }
  return {
    access: data.session.access_token,
    refresh: data.session.refresh_token,
  };
}

const adminTokens = await signIn(adminEmail, adminPassword);
const userTokens = await signIn(e2eUserEmail, e2eUserPassword);

const userPayload = decodePayload(userTokens.access);
const userId = userPayload && typeof userPayload.sub === "string" ? userPayload.sub : "";
if (!userId) {
  throw new Error("Unable to decode user id from E2E user access token.");
}

const balanceRes = await adminClient.from("coin_transactions").select("amount").eq("user_id", userId);
if (balanceRes.error) {
  throw new Error(`Unable to read user coin balance: ${balanceRes.error.message}`);
}

const currentBalance = (balanceRes.data || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
const targetBalance = 6000;
if (currentBalance < targetBalance) {
  const topUpRes = await adminClient.from("coin_transactions").insert({
    user_id: userId,
    amount: targetBalance - currentBalance,
    transaction_type: "manual_adjustment",
    description: "E2E top-up after Supabase key rotation",
  });
  if (topUpRes.error) {
    throw new Error(`Unable to top up E2E user coins: ${topUpRes.error.message}`);
  }
}

let nextEnv = envText;
nextEnv = upsert(nextEnv, "NEXT_PUBLIC_SUPABASE_ANON_KEY", newAnonKey);
nextEnv = upsert(nextEnv, "SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey);
nextEnv = upsert(nextEnv, "E2E_USER_ACCESS_TOKEN", userTokens.access);
nextEnv = upsert(nextEnv, "E2E_USER_REFRESH_TOKEN", userTokens.refresh);
nextEnv = upsert(nextEnv, "STAGING_BEARER_TOKEN", userTokens.access);
nextEnv = upsert(nextEnv, "E2E_ADMIN_ACCESS_TOKEN", adminTokens.access);
nextEnv = upsert(nextEnv, "E2E_ADMIN_REFRESH_TOKEN", adminTokens.refresh);

fs.writeFileSync(envPath, nextEnv);
console.log("Updated .env.local with rotated Supabase keys and refreshed E2E tokens.");
