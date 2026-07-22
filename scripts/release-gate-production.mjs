import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const requiredEnv = [
  "PROD_BASE_URL",
  "PROD_ADMIN_EMAIL",
  "PROD_ADMIN_PASSWORD",
];

const e2eEnv = [
  "E2E_BASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "E2E_USER_EMAIL",
  "E2E_USER_PASSWORD",
  "E2E_ADMIN_EMAIL",
  "E2E_ADMIN_PASSWORD",
  "E2E_MISSION_SLUG",
  "E2E_REWARD_SLUG",
];

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

async function confirmRequired(rl, prompt) {
  const answer = (await rl.question(`${prompt} Type yes to continue: `)).trim().toLowerCase();
  if (answer !== "yes") {
    throw new Error(`Checkpoint failed: ${prompt}`);
  }
}

async function confirmOptional(rl, prompt) {
  const answer = (await rl.question(`${prompt} Type yes to run, no to skip: `)).trim().toLowerCase();
  return answer === "yes";
}

async function main() {
  ensureRequiredEnv(requiredEnv);

  const rl = readline.createInterface({ input, output });
  try {
    await confirmRequired(rl, "Checkpoint 1 - Freeze window active and release/rollback owners are on-call.");
    await confirmRequired(rl, "Checkpoint 2 - Staging release gate completed successfully.");
    await confirmRequired(rl, "Checkpoint 3 - Production secrets and environment variables verified.");

    console.log("\nRun your production deployment and production migration now.");
    await confirmRequired(rl, "Checkpoint 4 - Production deploy and migrations completed with healthy status.");

    runStep("Production funnel alerts check", "npm", ["run", "alerts:funnel"], {
      STAGING_BASE_URL: process.env.PROD_BASE_URL,
      STAGING_ADMIN_EMAIL: process.env.PROD_ADMIN_EMAIL,
      STAGING_ADMIN_PASSWORD: process.env.PROD_ADMIN_PASSWORD,
      FAIL_ON_FUNNEL_WARN: process.env.FAIL_ON_FUNNEL_WARN ?? "0",
    });

    runStep("Production mobile API smoke", "npm", ["run", "verify:mobile:smoke"], {
      MOBILE_SMOKE_BASE_URL: process.env.PROD_BASE_URL,
      MOBILE_SMOKE_BEARER_TOKEN: process.env.PROD_MOBILE_BEARER_TOKEN,
    });

    if (await confirmOptional(rl, "Optional step - Run production-safe E2E smoke.")) {
      if (!hasAllEnv(e2eEnv)) {
        throw new Error("E2E smoke requested but required E2E_* variables are missing.");
      }
      runStep("Production-safe E2E smoke", "npm", ["run", "test:e2e:web"]);
    }

    if (await confirmOptional(rl, "Optional step - Run strict production-safe E2E redeem gate.")) {
      if (!hasAllEnv(e2eEnv)) {
        throw new Error("Strict E2E requested but required E2E_* variables are missing.");
      }
      runStep("Production-safe strict E2E gate", "npm", ["run", "test:e2e:web:strict"]);
    }

    await confirmRequired(rl, "Checkpoint 5 - 30-minute post-deploy monitoring window completed with no rollback triggers.");
    console.log("\nProduction gate completed successfully.");
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
