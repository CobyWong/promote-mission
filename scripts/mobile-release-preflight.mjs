import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const appJsonPath = path.join(root, "apps/mobile/app.json");
const easJsonPath = path.join(root, "apps/mobile/eas.json");
const mobileEnvPath = path.join(root, "apps/mobile/.env.local");

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const text = fs.readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function fail(message) {
  console.error(`x ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`ok ${message}`);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", cwd: root, env: process.env });
  if (result.status !== 0) {
    fail(`${command} ${args.join(" ")} failed`);
    return false;
  }

  return true;
}

console.log("Mobile release preflight");
loadDotEnvFile(mobileEnvPath);

if (!fs.existsSync(appJsonPath)) {
  fail("apps/mobile/app.json not found");
  process.exit(1);
}

if (!fs.existsSync(easJsonPath)) {
  fail("apps/mobile/eas.json not found");
  process.exit(1);
}

const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));
const easJson = JSON.parse(fs.readFileSync(easJsonPath, "utf8"));
const expo = appJson.expo ?? {};

if (!expo.name || expo.name === "mobile") {
  fail("apps/mobile/app.json expo.name should be a real app name");
} else {
  pass("app name configured");
}

if (!expo.slug || expo.slug === "mobile") {
  fail("apps/mobile/app.json expo.slug should be non-default");
} else {
  pass("app slug configured");
}

if (!expo.ios?.bundleIdentifier) {
  fail("apps/mobile/app.json expo.ios.bundleIdentifier is missing");
} else {
  pass("iOS bundle identifier configured");
}

if (!expo.android?.package) {
  fail("apps/mobile/app.json expo.android.package is missing");
} else {
  pass("Android package configured");
}

if (!easJson.build?.production) {
  fail("apps/mobile/eas.json production profile is missing");
} else {
  pass("EAS production profile configured");
}

const requiredMobileEnv = [
  "EXPO_PUBLIC_APP_ENV",
  "EXPO_PUBLIC_API_BASE_URL",
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
];

for (const key of requiredMobileEnv) {
  const value = (process.env[key] ?? "").trim();
  if (!value) {
    console.warn(`warn Missing env: ${key} (set in apps/mobile/.env.local or EAS secrets before cloud build)`);
  } else {
    pass(`${key} is set`);
  }
}

if (!run("npm", ["run", "mobile:typecheck"])) {
  process.exit(1);
}

console.log("Preflight complete.");
if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}
