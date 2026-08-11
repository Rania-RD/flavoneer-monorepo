import {
  buildLabSampleNumber,
  getSampleYear,
  normalizeProductionNumber,
} from "@flavoneer/backend/lab-samples";
import { expect, test } from "@playwright/test";

test("builds yearly raw-material and finished-product sample numbers", () => {
  expect(buildLabSampleNumber("raw_material", 2026, 131)).toBe("R26131");
  expect(buildLabSampleNumber("final_product", 2026, 1)).toBe("F260001");
});

test("uses the configured plant timezone for the sample year", () => {
  const sampledAt = Date.parse("2025-12-31T22:30:00.000Z");
  expect(getSampleYear(sampledAt, "Asia/Gaza")).toBe(2026);
});

test("normalizes and validates the production number", () => {
  expect(normalizeProductionNumber("290726 1")).toBe("2907261");
  expect(() => normalizeProductionNumber("3102261")).toThrow(
    "Production number contains an invalid date"
  );
});
