const baseUrl = process.env.STAGING_BASE_URL?.trim();
const adminEmail = process.env.STAGING_ADMIN_EMAIL?.trim();
const adminPassword = process.env.STAGING_ADMIN_PASSWORD?.trim();
const failOnWarn = process.env.FAIL_ON_FUNNEL_WARN === "1";

if (!baseUrl) {
  console.error("Missing STAGING_BASE_URL.");
  process.exit(1);
}

if (!adminEmail || !adminPassword) {
  console.error("Missing STAGING_ADMIN_EMAIL or STAGING_ADMIN_PASSWORD.");
  process.exit(1);
}

function getCookieHeader(response) {
  const maybeHeaders = response.headers;
  const getSetCookie = maybeHeaders.getSetCookie?.bind(maybeHeaders);
  const values = typeof getSetCookie === "function" ? getSetCookie() : [];

  if (values.length > 0) {
    return values.map((raw) => raw.split(";", 1)[0]).join("; ");
  }

  const single = response.headers.get("set-cookie");
  if (!single) {
    return "";
  }

  return single.split(";", 1)[0];
}

async function loginAdmin() {
  const response = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
    }),
  });

  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    throw new Error(`Admin login failed (${response.status}): ${payload?.error ?? "unknown"}`);
  }

  const cookie = getCookieHeader(response);
  if (!cookie) {
    throw new Error("Admin login succeeded but no session cookie was returned.");
  }

  return cookie;
}

async function main() {
  console.log(`Checking funnel alerts at ${baseUrl}`);
  const adminCookie = await loginAdmin();

  const response = await fetch(`${baseUrl}/api/admin/kpi/funnel/alerts`, {
    headers: {
      cookie: adminCookie,
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Funnel alerts endpoint failed (${response.status}): ${payload?.error ?? "unknown"}`);
  }

  const alerts = Array.isArray(payload?.alerts) ? payload.alerts : [];
  const critical = alerts.filter((item) => item?.severity === "critical");

  if (alerts.length === 0) {
    console.log("No funnel regressions detected.");
    return;
  }

  console.log(`Detected ${alerts.length} funnel alert(s):`);
  for (const alert of alerts) {
    console.log(`- [${alert.severity ?? "warn"}] ${alert.key}: drop ${alert.dropPct}% (threshold ${alert.thresholdPct}%)`);
  }

  if (critical.length > 0) {
    throw new Error(`Critical funnel regressions detected (${critical.length}).`);
  }

  if (failOnWarn) {
    throw new Error("Funnel regressions detected and FAIL_ON_FUNNEL_WARN=1.");
  }

  console.log("Only warning-level funnel regressions detected; continuing.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
