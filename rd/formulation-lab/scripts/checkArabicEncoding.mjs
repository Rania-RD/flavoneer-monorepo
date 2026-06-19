import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const AR_LOCALE = path.join(ROOT, "locales", "ar.json");
const QUESTION_MARK_RUN_REGEX = /\?{3,}/;
const MOJIBAKE_REGEX = /(?:Ø|Ù|�)/;

const violations = [];

function visitValue(value, trail) {
  if (typeof value === "string") {
    if (QUESTION_MARK_RUN_REGEX.test(value) || MOJIBAKE_REGEX.test(value)) {
      violations.push(`${trail}: ${value}`);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      visitValue(item, `${trail}[${index}]`);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      visitValue(child, trail ? `${trail}.${key}` : key);
    }
  }
}

if (!fs.existsSync(AR_LOCALE)) {
  console.error(`Arabic locale file was not found: ${AR_LOCALE}`);
  process.exit(1);
}

visitValue(JSON.parse(fs.readFileSync(AR_LOCALE, "utf8")), "ar");

if (violations.length > 0) {
  console.error("Arabic encoding guard failed:");
  for (const violation of violations) {
    console.error(violation);
  }
  process.exit(1);
}

console.log("Arabic encoding guard passed.");
