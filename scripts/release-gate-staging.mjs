import { spawnSync } from "node:child_process";

const requiredEnv = [
  "STAGING_BASE_URL",
  "STAGING_ADMIN_EMAIL",
  "STAGING_ADMIN_PASSWORD",
];

const e2eEnv = [
  "E2E_BASE_URL",
  "E2E_USER_ACCESS_TOKEN",
  "E2E_USER_REFRESH_TOKEN",
  "E2E_ADMIN_EMAIL",
  "E2E_ADMIN_PASSWORD",
  "E2E_MISSION_SLUG",
  "E2E_REWARD_SLUG",
];

const strictE2E = process.env.RELEASE_GATE_STRICT_E2E === "1";
const failOnWarn = process.env.FAIL_ON_FUNNEL_WARN ?? "0";

function ensureRequiredEnv(keys) {
  const missing = keys.filter((key) => !(process.env[key] ?? "").trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

function hasAllEnv(keys) {
  return keys.every((key) => Boolean((process.env[key] ?? "").trim()));
}

function runStep(label, command, args, extraEnv = {}) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  if ((result.status ?? 1) !== 0) {
    throw new Error(`Step failed: ${label}`);
  }
}

function main() {
  ensureRequiredEnv(requiredEnv);

  runStep("Environment template check", "npm", ["run", "check:env"]);
  runStep("Lint", "npm", ["run", "lint"]);
  runStep("Typecheck web", "npm", ["run", "typecheck"]);
  runStep("Typecheck mobile", "npm", ["run", "mobile:typecheck"]);
  runStep("Unit/integration tests", "npm", ["run", "test"]);
  runStep("Build", "npm", ["run", "build"]);

  runStep("Staging abuse/idempotency verification", "npm", ["run", "verify:staging"]);
  runStep("Funnel alerts check", "npm", ["run", "alerts:funnel"], {
    FAIL_ON_FUNNEL_WARN: failOnWarn,
  });
  runStep("Funnel baseline threshold recommendation", "npm", ["run", "funnel:baseline"]);

  if (!hasAllEnv(e2eEnv)) {
    if (strictE2E) {
      throw new Error("RELEASE_GATE_STRICT_E2E=1 but required E2E env vars are missing.");
    }

    console.log("\n==> E2E checks skipped (set E2E_* vars to enable).\n");
    console.log("Release gate completed without E2E checks.");
    return;
  }

  if (strictE2E) {
    runStep("Web E2E strict redeem gate", "npm", ["run", "test:e2e:web:strict"]);
  } else {
    runStep("Web E2E smoke", "npm", ["run", "test:e2e:web"]);
  }

  console.log("\nRelease gate completed successfully.");
}

main();
