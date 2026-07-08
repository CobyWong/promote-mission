const baseUrl = process.env.STAGING_BASE_URL?.trim();
const adminEmail = process.env.STAGING_ADMIN_EMAIL?.trim();
const adminPassword = process.env.STAGING_ADMIN_PASSWORD?.trim();

if (!baseUrl || !adminEmail || !adminPassword) {
  console.error("Missing STAGING_BASE_URL, STAGING_ADMIN_EMAIL, or STAGING_ADMIN_PASSWORD.");
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

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function suggestDropThreshold(values) {
  if (values.length === 0) {
    return 30;
  }

  const avg = average(values);
  if (avg <= 0) {
    return 30;
  }

  const min = Math.min(...values);
  const observedSwingPct = ((avg - min) / avg) * 100;
  const suggested = Math.round(Math.max(20, Math.min(50, observedSwingPct + 10)));
  return suggested;
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

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Admin login failed (${response.status}): ${payload?.error ?? "unknown"}`);
  }

  const cookie = getCookieHeader(response);
  if (!cookie) {
    throw new Error("Admin login succeeded but no session cookie was returned.");
  }

  return cookie;
}

async function main() {
  console.log(`Generating funnel baseline report from ${baseUrl}`);
  const adminCookie = await loginAdmin();

  const response = await fetch(`${baseUrl}/api/admin/kpi/funnel?range=7d`, {
    headers: {
      cookie: adminCookie,
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.series) {
    throw new Error(`Unable to load funnel series (${response.status}).`);
  }

  const series = payload.series;
  const submissionValues = series.map((item) => Number(item.submissionCreated ?? 0));
  const approvalValues = series.map((item) => Number(item.submissionApproved ?? 0));
  const redemptionValues = series.map((item) => Number(item.redemptionRequested ?? 0));

  const submissionThreshold = suggestDropThreshold(submissionValues);
  const approvalThreshold = suggestDropThreshold(approvalValues);
  const redemptionThreshold = suggestDropThreshold(redemptionValues);

  console.log("Suggested alert thresholds from last 7d daily volatility:");
  console.log(`- FUNNEL_ALERT_SUBMISSION_DROP_PCT=${submissionThreshold}`);
  console.log(`- FUNNEL_ALERT_APPROVE_DROP_PCT=${approvalThreshold}`);
  console.log(`- FUNNEL_ALERT_REDEEM_DROP_PCT=${redemptionThreshold}`);
  console.log("Use these as starting points and re-check after another 2-3 days.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
