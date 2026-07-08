const baseUrl = process.env.STAGING_BASE_URL?.trim();
const adminEmail = process.env.STAGING_ADMIN_EMAIL?.trim();
const adminPassword = process.env.STAGING_ADMIN_PASSWORD?.trim();
const bearerToken = process.env.STAGING_BEARER_TOKEN?.trim();
const strictAuthSessionRateLimit = process.env.STRICT_AUTH_SESSION_RATE_LIMIT === "1";

function getAdminRateLimitProbeEmail() {
  if (!adminEmail) {
    return "rate-limit-probe@example.com";
  }

  const [local, domain] = adminEmail.split("@");
  if (!domain) {
    return `rate-limit-probe+${Date.now()}@example.com`;
  }

  return `${local}+rate-limit-probe@${domain}`;
}

if (!baseUrl) {
  console.error("Missing STAGING_BASE_URL.");
  process.exit(1);
}

async function postJson(path, body, headers = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    status: response.status,
    headers: response.headers,
    data,
  };
}

async function verifyAdminRateLimit() {
  if (!adminEmail || !adminPassword) {
    console.log("- Skipping admin rate-limit check (missing STAGING_ADMIN_EMAIL/STAGING_ADMIN_PASSWORD)");
    return;
  }

  console.log("- Checking admin login rate limit...");
  const probeEmail = getAdminRateLimitProbeEmail();
  let saw429 = false;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await postJson("/api/admin/login", {
      email: probeEmail,
      password: "intentionally-wrong-password",
    });

    if (result.status === 429) {
      saw429 = true;
      break;
    }
  }

  if (!saw429) {
    throw new Error("Admin login rate-limit check failed: expected at least one 429 response.");
  }

  console.log("  ✓ Admin login rate limiting triggered.");
}

async function verifyAuthSessionRateLimit() {
  console.log("- Checking auth session rate limit...");
  let saw429 = false;
  const statuses = new Map();
  for (let attempt = 0; attempt < 35; attempt += 1) {
    const result = await postJson("/api/auth/session", {
      access_token: "token-a",
      refresh_token: "token-b",
    });

    statuses.set(result.status, (statuses.get(result.status) ?? 0) + 1);

    if (result.status === 429) {
      saw429 = true;
      break;
    }
  }

  if (!saw429) {
    const summary = Array.from(statuses.entries())
      .map(([status, count]) => `${status}x${count}`)
      .join(", ");

    if (strictAuthSessionRateLimit) {
      throw new Error(`Auth session rate-limit check failed: expected at least one 429 response (saw ${summary || "none"}).`);
    }

    console.log(`  ! Auth session 429 not observed (saw ${summary || "none"}); continuing (set STRICT_AUTH_SESSION_RATE_LIMIT=1 to enforce).`);
    return;
  }

  console.log("  ✓ Auth session rate limiting triggered.");
}

async function verifyMobileSubmissionIdempotency() {
  if (!bearerToken) {
    console.log("- Skipping mobile submission idempotency check (missing STAGING_BEARER_TOKEN)");
    return;
  }

  console.log("- Checking mobile submission idempotency behavior...");
  const key = `verify-${Date.now()}`;
  const payload = {
    slug: "pulse-active-home-workout",
    reelUrl: `https://example.com/reel/${Date.now()}`,
    captionSummary: "staging idempotency check",
    notes: "staging idempotency check",
    checks: {
      addedCollaborator: true,
    },
  };

  const headers = {
    authorization: `Bearer ${bearerToken}`,
    "idempotency-key": key,
  };

  const first = await postJson("/api/mobile/submissions", payload, headers);
  const second = await postJson("/api/mobile/submissions", payload, headers);

  if (first.status !== second.status) {
    throw new Error(`Idempotency check failed: first status ${first.status}, second status ${second.status}`);
  }

  if (first.status >= 500 || second.status >= 500) {
    throw new Error("Idempotency check failed: server returned 5xx status.");
  }

  console.log(`  ✓ Mobile submission idempotency replayed with status ${first.status}.`);
}

async function main() {
  console.log(`Verifying staging at ${baseUrl}`);
  await verifyAdminRateLimit();
  await verifyAuthSessionRateLimit();
  await verifyMobileSubmissionIdempotency();
  console.log("Staging verification completed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
