import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LOCALE_FILES = [
  path.join(ROOT, "locales", "ar.json"),
  path.join(ROOT, "locales", "en.json"),
];
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

for (const localeFile of LOCALE_FILES) {
  if (!fs.existsSync(localeFile)) {
    console.error(`Locale file was not found: ${localeFile}`);
    process.exit(1);
  }
  const localeName = path.basename(localeFile, ".json");
  visitValue(JSON.parse(fs.readFileSync(localeFile, "utf8")), localeName);
}

if (violations.length > 0) {
  console.error("Arabic encoding guard failed:");
  for (const violation of violations) {
    console.error(violation);
  }
  process.exit(1);
}

console.log("Arabic encoding guard passed.");
