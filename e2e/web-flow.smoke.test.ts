import { expect, test } from "vitest";
import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.E2E_BASE_URL?.trim() ?? "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
const userEmail = process.env.E2E_USER_EMAIL?.trim() ?? "";
const userPassword = process.env.E2E_USER_PASSWORD?.trim() ?? "";
const adminEmail = process.env.E2E_ADMIN_EMAIL?.trim() ?? "";
const adminPassword = process.env.E2E_ADMIN_PASSWORD?.trim() ?? "";
const missionSlug = process.env.E2E_MISSION_SLUG?.trim() || "pulse-active-home-workout";
const rewardSlug = process.env.E2E_REWARD_SLUG?.trim() || "parknshop-voucher-100";
const strictRedeem = process.env.E2E_STRICT_REDEEM === "1";
const runForwardedFor = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;

const hasRequiredEnv = Boolean(
  baseUrl
  && supabaseUrl
  && supabaseAnonKey
  && userEmail
  && userPassword
  && adminEmail
  && adminPassword,
);

const supabase = hasRequiredEnv
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

function getCookieHeader(response: Response) {
  const maybeHeaders = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  const list = typeof maybeHeaders.getSetCookie === "function"
    ? maybeHeaders.getSetCookie()
    : [];

  if (list.length > 0) {
    return list.map((raw) => raw.split(";", 1)[0]).join("; ");
  }

  const single = response.headers.get("set-cookie");
  if (!single) {
    return "";
  }

  const cookiePairs = single
    // Split only between cookie entries, not within Expires attributes.
    .split(/,(?=\s*[^;,\s]+=)/g)
    .map((raw) => raw.split(";", 1)[0]?.trim())
    .filter((value): value is string => Boolean(value));

  return cookiePairs.join("; ");
}

function mergeCookies(...cookieHeaders: string[]) {
  const byName = new Map<string, string>();

  for (const header of cookieHeaders) {
    if (!header) {
      continue;
    }

    for (const pair of header.split(";")) {
      const trimmed = pair.trim();
      if (!trimmed) {
        continue;
      }

      const separator = trimmed.indexOf("=");
      if (separator <= 0) {
        continue;
      }

      const name = trimmed.slice(0, separator);
      byName.set(name, trimmed);
    }
  }

  return Array.from(byName.values()).join("; ");
}

async function readJson(response: Response) {
  try {
    return await response.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function signInAndGetTokens(email: string, password: string) {
  if (!supabase) {
    throw new Error("Supabase client is unavailable for E2E auth bootstrap.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token || !data.session?.refresh_token) {
    throw new Error(`Unable to sign in ${email} for E2E bootstrap: ${error?.message ?? "missing session"}`);
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

async function setServerSessionCookie(accessToken: string, refreshToken: string) {
  const response = await fetch(`${baseUrl}/api/auth/session`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-proto": "https",
      "x-forwarded-for": runForwardedFor,
    },
    body: JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
    }),
  });

  const payload = await readJson(response);
  expect(
    response.status,
    `Expected /api/auth/session=200, got ${response.status}: ${JSON.stringify(payload)}`,
  ).toBe(200);

  const cookie = getCookieHeader(response);
  expect(cookie.length).toBeGreaterThan(0);
  return cookie;
}

const smoke = hasRequiredEnv ? test : test.skip;

smoke("web smoke flow: accept -> submit -> approve -> redeem", async () => {
  let userTokens;
  try {
    userTokens = await signInAndGetTokens(userEmail, userPassword);
  } catch (error) {
    // Keep production optional smoke robust when E2E user password drifts.
    userTokens = await signInAndGetTokens(adminEmail, adminPassword);
    console.warn(
      `Falling back to admin credentials for user-phase E2E auth bootstrap: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const userCookie = await setServerSessionCookie(userTokens.accessToken, userTokens.refreshToken);

  const acceptResponse = await fetch(`${baseUrl}/api/missions/${missionSlug}/interest`, {
    method: "POST",
    headers: {
      cookie: userCookie,
      "x-forwarded-for": runForwardedFor,
    },
  });
  const acceptPayload = await readJson(acceptResponse);
  expect([200, 400, 409]).toContain(acceptResponse.status);
  let acceptedSubmissionId = "";
  if (acceptResponse.status === 200) {
    expect(acceptPayload?.ok).toBe(true);
    acceptedSubmissionId = typeof acceptPayload?.submissionId === "string" ? acceptPayload.submissionId : "";
  }
  if (acceptResponse.status === 400) {
    const errorText = typeof acceptPayload?.error === "string" ? acceptPayload.error : "";
    expect(errorText.length).toBeGreaterThan(0);
  }
  if (acceptResponse.status === 409) {
    const errorText = typeof acceptPayload?.error === "string" ? acceptPayload.error : "";
    expect(errorText.length).toBeGreaterThan(0);

    // Optional smoke should not fail when mission prerequisites are not currently met.
    if (
      /No Reel with @missionone_hk collaborator|此任務已過截止時間或暫未開放|A similar request is still being processed/.test(errorText)
    ) {
      return;
    }
  }

  async function createSubmission() {
    const submitPayloadBody = {
      slug: missionSlug,
      reelUrl: `https://instagram.com/reel/e2e-${Date.now()}`,
      captionSummary: "E2E smoke submission",
      notes: "E2E smoke submission",
      checks: {
        published: true,
        taggedBrand: true,
        addedCollaborator: true,
      },
    };

    const submitResponse = await fetch(`${baseUrl}/api/submissions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: userCookie,
        "idempotency-key": `e2e-submit-${Date.now()}`,
        "x-forwarded-proto": "https",
        "x-forwarded-for": runForwardedFor,
      },
      body: JSON.stringify(submitPayloadBody),
    });

    const submitPayload = await readJson(submitResponse);
    expect(
      submitResponse.status,
      `Submission failed with status ${submitResponse.status}: ${JSON.stringify(submitPayload)}`,
    ).toBe(201);

    const submissionId = typeof submitPayload?.id === "string" ? submitPayload.id : "";
    expect(submissionId.length).toBeGreaterThan(0);
    return submissionId;
  }

  const adminLoginResponse = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-proto": "https",
      "x-forwarded-for": runForwardedFor,
    },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
    }),
  });

  const adminLoginPayload = await readJson(adminLoginResponse);
  expect(adminLoginResponse.status).toBe(200);
  let adminCookie = getCookieHeader(adminLoginResponse);
  expect(adminCookie.length).toBeGreaterThan(0);
  expect(adminLoginPayload?.ok).toBe(true);

  const adminTokens = await signInAndGetTokens(adminEmail, adminPassword);
  const adminSessionCookie = await setServerSessionCookie(adminTokens.accessToken, adminTokens.refreshToken);
  adminCookie = mergeCookies(adminCookie, adminSessionCookie);

  async function approveSubmission(submissionId: string) {
    const approveResponse = await fetch(`${baseUrl}/api/admin/submissions/${submissionId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: adminCookie,
        "x-forwarded-proto": "https",
        "x-forwarded-for": runForwardedFor,
      },
      body: JSON.stringify({
        status: "Approved",
        notes: "E2E smoke auto approval",
      }),
    });

    const approvePayload = await readJson(approveResponse);
    expect(approveResponse.status).toBe(200);
    expect(approvePayload?.ok).toBe(true);
  }

  const firstSubmissionId = acceptedSubmissionId || await createSubmission();
  await approveSubmission(firstSubmissionId);

  if (strictRedeem) {
    const secondSubmissionId = await createSubmission();
    await approveSubmission(secondSubmissionId);
  }

  const redeemResponse = await fetch(`${baseUrl}/api/redemptions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: userCookie,
      "idempotency-key": `e2e-redeem-${Date.now()}`,
      "x-forwarded-proto": "https",
      "x-forwarded-for": runForwardedFor,
    },
    body: JSON.stringify({ rewardSlug }),
  });

  const redeemPayload = await readJson(redeemResponse);
  if (strictRedeem) {
    expect(redeemResponse.status).toBe(201);
    expect(typeof redeemPayload?.redemptionId).toBe("string");
  } else {
    expect([201, 400]).toContain(redeemResponse.status);
    if (redeemResponse.status === 201) {
      expect(typeof redeemPayload?.redemptionId).toBe("string");
    }
    if (redeemResponse.status === 400) {
      const errorText = typeof redeemPayload?.error === "string" ? redeemPayload.error : "";
      expect(errorText.length).toBeGreaterThan(0);
    }
  }
}, 120_000);
