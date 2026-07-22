import fs from "node:fs";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const envPath = ".env.local";
const envText = fs.readFileSync(envPath, "utf8");

function readEnv(key) {
  const match = envText.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim() : "";
}

function upsert(text, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(text)) {
    return text.replace(re, line);
  }
  return `${text.endsWith("\n") ? text : `${text}\n`}${line}\n`;
}

function decodeJwtPayload(jwt) {
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRole) {
  throw new Error("Missing Supabase URL/anon/service-role env vars.");
}

const adminEmail = process.env.STAGING_ADMIN_EMAIL || readEnv("STAGING_ADMIN_EMAIL");
if (!adminEmail) {
  throw new Error("Missing STAGING_ADMIN_EMAIL.");
}

const e2eUserEmailFromEnv = process.env.E2E_USER_EMAIL || readEnv("E2E_USER_EMAIL");
const e2eUserToken = process.env.E2E_USER_ACCESS_TOKEN || readEnv("E2E_USER_ACCESS_TOKEN");
const e2ePayload = e2eUserToken ? decodeJwtPayload(e2eUserToken) : null;
const e2eUserEmailFromToken = e2ePayload && typeof e2ePayload.email === "string" ? e2ePayload.email : "";
const e2eUserEmail = e2eUserEmailFromEnv || e2eUserEmailFromToken || "e2e.creator@luck323.com";

const newAdminPassword = `Adm_${crypto.randomBytes(12).toString("base64url")}`;
const newE2eUserPassword = `Usr_${crypto.randomBytes(12).toString("base64url")}`;

const adminClient = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
const anonClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

async function upsertAuthUser(email, password, metadata) {
  const listed = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) {
    throw new Error(`listUsers failed: ${listed.error.message}`);
  }

  const existing = (listed.data?.users || []).find((u) => String(u.email || "").toLowerCase() === email.toLowerCase());
  if (existing) {
    const updated = await adminClient.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (updated.error) {
      throw new Error(`updateUserById failed for ${email}: ${updated.error.message}`);
    }
    return existing.id;
  }

  const created = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (created.error) {
    throw new Error(`createUser failed for ${email}: ${created.error.message}`);
  }

  return created.data.user?.id || "";
}

async function signInForTokens(email, password) {
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token || !data.session?.refresh_token) {
    throw new Error(`signInWithPassword failed for ${email}: ${error?.message || "unknown error"}`);
  }
  return {
    access: data.session.access_token,
    refresh: data.session.refresh_token,
  };
}

await upsertAuthUser(adminEmail, newAdminPassword, { account_type: "admin", email_verified: true });
await upsertAuthUser(e2eUserEmail, newE2eUserPassword, { account_type: "creator", email_verified: true });

const adminTokens = await signInForTokens(adminEmail, newAdminPassword);
const userTokens = await signInForTokens(e2eUserEmail, newE2eUserPassword);

const userPayload = decodeJwtPayload(userTokens.access);
const userId = userPayload && typeof userPayload.sub === "string" ? userPayload.sub : "";
if (!userId) {
  throw new Error("Unable to decode E2E user id from token.");
}

const balanceRes = await adminClient.from("coin_transactions").select("amount").eq("user_id", userId);
if (balanceRes.error) {
  throw new Error(`coin balance read failed: ${balanceRes.error.message}`);
}

const currentBalance = (balanceRes.data || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
const targetBalance = 6000;
if (currentBalance < targetBalance) {
  const topUp = await adminClient.from("coin_transactions").insert({
    user_id: userId,
    amount: targetBalance - currentBalance,
    transaction_type: "manual_adjustment",
    description: "E2E top-up after token rotation",
  });
  if (topUp.error) {
    throw new Error(`coin top-up failed: ${topUp.error.message}`);
  }
}

let nextEnv = envText;
nextEnv = upsert(nextEnv, "ADMIN_EMAILS", `admin@example.com,${adminEmail.toLowerCase()}`);
nextEnv = upsert(nextEnv, "ADMIN_PASSWORD", newAdminPassword);
nextEnv = upsert(nextEnv, "STAGING_ADMIN_EMAIL", adminEmail.toLowerCase());
nextEnv = upsert(nextEnv, "STAGING_ADMIN_PASSWORD", newAdminPassword);
nextEnv = upsert(nextEnv, "E2E_USER_EMAIL", e2eUserEmail.toLowerCase());
nextEnv = upsert(nextEnv, "E2E_USER_PASSWORD", newE2eUserPassword);
nextEnv = upsert(nextEnv, "E2E_USER_ACCESS_TOKEN", userTokens.access);
nextEnv = upsert(nextEnv, "E2E_USER_REFRESH_TOKEN", userTokens.refresh);
nextEnv = upsert(nextEnv, "STAGING_BEARER_TOKEN", userTokens.access);
nextEnv = upsert(nextEnv, "E2E_ADMIN_ACCESS_TOKEN", adminTokens.access);
nextEnv = upsert(nextEnv, "E2E_ADMIN_REFRESH_TOKEN", adminTokens.refresh);
nextEnv = upsert(nextEnv, "E2E_MISSION_SLUG", "fitbyte-protein-chips");
nextEnv = upsert(nextEnv, "E2E_REWARD_SLUG", "netflix-standard-1m");

fs.writeFileSync(envPath, nextEnv);
console.log("Rotation complete: admin password and E2E tokens refreshed.");
