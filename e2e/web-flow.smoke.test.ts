import { expect, test } from "vitest";

const baseUrl = process.env.E2E_BASE_URL?.trim() ?? "";
const userAccessToken = process.env.E2E_USER_ACCESS_TOKEN?.trim() ?? "";
const userRefreshToken = process.env.E2E_USER_REFRESH_TOKEN?.trim() ?? "";
const adminEmail = process.env.E2E_ADMIN_EMAIL?.trim() ?? "";
const adminPassword = process.env.E2E_ADMIN_PASSWORD?.trim() ?? "";
const missionSlug = process.env.E2E_MISSION_SLUG?.trim() || "pulse-active-home-workout";
const rewardSlug = process.env.E2E_REWARD_SLUG?.trim() || "parknshop-voucher-100";
const strictRedeem = process.env.E2E_STRICT_REDEEM === "1";

const hasRequiredEnv = Boolean(baseUrl && userAccessToken && userRefreshToken && adminEmail && adminPassword);

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

  return single.split(";", 1)[0];
}

async function readJson(response: Response) {
  try {
    return await response.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

const smoke = hasRequiredEnv ? test : test.skip;

smoke("web smoke flow: accept -> submit -> approve -> redeem", async () => {
  const userSessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-proto": "https",
    },
    body: JSON.stringify({
      access_token: userAccessToken,
      refresh_token: userRefreshToken,
    }),
  });

  expect(userSessionResponse.status).toBe(200);
  const userCookie = getCookieHeader(userSessionResponse);
  expect(userCookie.length).toBeGreaterThan(0);

  const acceptResponse = await fetch(`${baseUrl}/api/missions/${missionSlug}/interest`, {
    method: "POST",
    headers: {
      cookie: userCookie,
    },
  });
  expect(acceptResponse.status).toBe(200);

  const formData = new FormData();
  formData.set("slug", missionSlug);
  formData.set("reelUrl", `https://instagram.com/reel/e2e-${Date.now()}`);
  formData.set("captionSummary", "E2E smoke submission");
  formData.set("notes", "E2E smoke submission");
  formData.set("checks", JSON.stringify({
    published: true,
    taggedBrand: true,
    addedCollaborator: true,
  }));

  const submitResponse = await fetch(`${baseUrl}/api/submissions`, {
    method: "POST",
    headers: {
      cookie: userCookie,
      "idempotency-key": `e2e-submit-${Date.now()}`,
      "x-forwarded-proto": "https",
    },
    body: formData,
  });

  const submitPayload = await readJson(submitResponse);
  expect(submitResponse.status).toBe(201);
  const submissionId = typeof submitPayload?.id === "string" ? submitPayload.id : "";
  expect(submissionId.length).toBeGreaterThan(0);

  const adminLoginResponse = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-proto": "https",
    },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
    }),
  });

  const adminLoginPayload = await readJson(adminLoginResponse);
  expect(adminLoginResponse.status).toBe(200);
  const adminCookie = getCookieHeader(adminLoginResponse);
  expect(adminCookie.length).toBeGreaterThan(0);
  expect(adminLoginPayload?.ok).toBe(true);

  const approveResponse = await fetch(`${baseUrl}/api/admin/submissions/${submissionId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: adminCookie,
      "x-forwarded-proto": "https",
    },
    body: JSON.stringify({
      status: "Approved",
      notes: "E2E smoke auto approval",
    }),
  });

  const approvePayload = await readJson(approveResponse);
  expect(approveResponse.status).toBe(200);
  expect(approvePayload?.ok).toBe(true);

  const redeemResponse = await fetch(`${baseUrl}/api/redemptions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: userCookie,
      "idempotency-key": `e2e-redeem-${Date.now()}`,
      "x-forwarded-proto": "https",
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
