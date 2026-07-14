const explicitBaseUrl = process.env.MOBILE_SMOKE_BASE_URL?.trim();
const stagingBaseUrl = process.env.STAGING_BASE_URL?.trim();
const productionBaseUrl = process.env.PROD_BASE_URL?.trim();

const baseUrl = explicitBaseUrl || stagingBaseUrl || productionBaseUrl;
const bearerToken = process.env.MOBILE_SMOKE_BEARER_TOKEN?.trim() || process.env.STAGING_BEARER_TOKEN?.trim() || process.env.PROD_MOBILE_BEARER_TOKEN?.trim();

if (!baseUrl) {
  console.error("Missing MOBILE_SMOKE_BASE_URL (or STAGING_BASE_URL / PROD_BASE_URL).\nExample: MOBILE_SMOKE_BASE_URL=https://staging.example.com npm run verify:mobile:smoke");
  process.exit(1);
}

function toAbsolute(path) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

async function request(path, init = {}, options = {}) {
  const { includeAuth = true } = options;
  const headers = new Headers(init.headers ?? {});

  if (includeAuth && bearerToken && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${bearerToken}`);
  }

  const response = await fetch(toAbsolute(path), {
    ...init,
    headers,
  });
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  return {
    status: response.status,
    headers: response.headers,
    json,
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function verifyPublicMissions() {
  console.log("- Checking public mobile missions endpoint...");
  const result = await request("/api/mobile/missions");

  assert(result.status === 200, `Expected 200 from /api/mobile/missions, got ${result.status}`);
  assert(Array.isArray(result.json?.missions), "Expected missions array from /api/mobile/missions.");

  console.log(`  ✓ /api/mobile/missions ok (missions=${result.json.missions.length})`);
}

async function verifyAuthenticatedMobileEndpoints(token) {
  console.log("- Checking authenticated mobile endpoints...");

  const me = await request("/api/mobile/me", {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  assert(me.status === 200, `Expected 200 from /api/mobile/me, got ${me.status}`);
  assert(typeof me.json?.user?.id === "string" && me.json.user.id.length > 0, "Expected user.id from /api/mobile/me.");

  const submissions = await request("/api/mobile/submissions?limit=1", {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  assert(submissions.status === 200, `Expected 200 from /api/mobile/submissions, got ${submissions.status}`);
  assert(Array.isArray(submissions.json?.submissions), "Expected submissions array from /api/mobile/submissions.");

  console.log("  ✓ /api/mobile/me and /api/mobile/submissions ok");
}

async function verifyUnauthorizedBehavior() {
  console.log("- Checking unauthorized behavior for /api/mobile/me...");
  const result = await request("/api/mobile/me", {}, { includeAuth: false });

  assert(result.status === 401, `Expected 401 from /api/mobile/me without token, got ${result.status}`);
  console.log("  ✓ /api/mobile/me unauthorized guard ok");
}

async function main() {
  console.log(`Running mobile smoke checks against ${baseUrl}`);

  await verifyPublicMissions();

  if (bearerToken) {
    await verifyAuthenticatedMobileEndpoints(bearerToken);
  } else {
    console.log("- MOBILE_SMOKE_BEARER_TOKEN not set; running unauthorized-path check only.");
    await verifyUnauthorizedBehavior();
  }

  console.log("Mobile smoke checks completed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
