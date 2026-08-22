import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requireLocal = process.argv.includes("--require-local");

const targets = Object.freeze({
  development: Object.freeze({
    backend: "https://rare-toad-730.convex.cloud",
    site: "https://rare-toad-730.convex.site",
  }),
  production: Object.freeze({
    backend: "https://backend.prod.convex.flavoneer.com",
    site: "https://site.prod.convex.flavoneer.com",
    dashboard: "https://dashboard.prod.convex.flavoneer.com",
  }),
});

function fail(message) {
  throw new Error(`[convex-targets] ${message}`);
}

function readText(relativePath, { required = true } = {}) {
  const absolutePath = resolve(repositoryRoot, relativePath);
  if (!existsSync(absolutePath)) {
    if (required) fail(`${relativePath} is missing`);
    return undefined;
  }
  return readFileSync(absolutePath, "utf8");
}

function parseEnv(relativePath, options) {
  const source = readText(relativePath, options);
  if (source === undefined) return undefined;
  return Object.fromEntries(
    source
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        if (separator < 1) fail(`${relativePath} contains an invalid environment entry`);
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

function normalizeOrigin(value, label) {
  if (!value) fail(`${label} is required`);
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${label} must be a valid absolute URL`);
  }
  if (url.protocol !== "https:") fail(`${label} must use HTTPS`);
  if (url.pathname !== "/" || url.search || url.hash) {
    fail(`${label} must be an origin without a path, query, or fragment`);
  }
  return url.origin;
}

function expectOrigin(value, expected, label) {
  const actualOrigin = normalizeOrigin(value, label);
  if (actualOrigin !== expected) {
    fail(`${label} must point to ${expected}`);
  }
}

function validateMobileEnv(env, target, label) {
  expectOrigin(env.EXPO_PUBLIC_CONVEX_URL, target.backend, `${label} backend`);
  expectOrigin(env.EXPO_PUBLIC_CONVEX_SITE_URL, target.site, `${label} site`);
}

const mobileExample = parseEnv("rd/mobile/.env.example");
validateMobileEnv(mobileExample, targets.development, "mobile example development");

const mobileProductionExample = parseEnv("rd/mobile/.env.production.example");
validateMobileEnv(mobileProductionExample, targets.production, "mobile example production");

const mobileLocal = parseEnv("rd/mobile/.env", { required: requireLocal });
if (mobileLocal) validateMobileEnv(mobileLocal, targets.development, "mobile local development");

const easConfig = JSON.parse(readText("rd/mobile/eas.json"));
validateMobileEnv(easConfig.build.development.env, targets.development, "EAS development");
validateMobileEnv(easConfig.build.preview.env, targets.development, "EAS preview");
validateMobileEnv(easConfig.build.production.env, targets.production, "EAS production");

const labProduction = parseEnv("rd/formulation-lab/.env.production.example");
expectOrigin(
  labProduction.VITE_CONVEX_URL,
  targets.production.backend,
  "formulation lab production backend",
);
expectOrigin(
  labProduction.VITE_CONVEX_SITE_URL,
  targets.production.site,
  "formulation lab production site",
);

const backendExample = parseEnv("packages/backend/.env.production.example");
expectOrigin(
  backendExample.CONVEX_SELF_HOSTED_URL,
  targets.production.backend,
  "backend production CLI target",
);
expectOrigin(backendExample.CONVEX_SITE_URL, targets.production.site, "backend production site");
expectOrigin(
  backendExample.CONVEX_SELF_HOSTED_DASHBOARD_URL,
  targets.production.dashboard,
  "backend production dashboard",
);
if (backendExample.CONVEX_SELF_HOSTED_ADMIN_KEY) {
  fail("packages/backend/.env.production.example must not contain an admin key");
}

const backendLocal = parseEnv("packages/backend/.env.production.local", {
  required: requireLocal,
});
if (backendLocal) {
  expectOrigin(
    backendLocal.CONVEX_SELF_HOSTED_URL,
    targets.production.backend,
    "local self-hosted CLI target",
  );
  expectOrigin(backendLocal.CONVEX_SITE_URL, targets.production.site, "local self-hosted site");
  expectOrigin(
    backendLocal.CONVEX_SELF_HOSTED_DASHBOARD_URL,
    targets.production.dashboard,
    "local self-hosted dashboard",
  );
  if (
    !/^self-hosted-convex\|[0-9a-f]{64,}$/u.test(backendLocal.CONVEX_SELF_HOSTED_ADMIN_KEY ?? "")
  ) {
    fail("local self-hosted admin key is missing or malformed");
  }
}

console.log("Convex target validation passed:");
console.log(`- Cloud development: ${targets.development.backend}`);
console.log(`- Self-hosted production: ${targets.production.backend}`);
console.log(`- Production dashboard: ${targets.production.dashboard}`);
console.log(`- Local credentials: ${backendLocal ? "configured (value hidden)" : "not present"}`);
