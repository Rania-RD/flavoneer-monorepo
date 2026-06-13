import { expect, test } from "@playwright/test";
import {
  formatLimitValue,
  normalizeInsNumber,
  parentCategoryCodes,
} from "../convex/regulatoryHelpers";

test.describe("additive limit helpers", () => {
  test("normalizes E-number and INS input into the same additive key", () => {
    expect(normalizeInsNumber("E941")).toBe("941");
    expect(normalizeInsNumber("INS 941")).toBe("941");
    expect(normalizeInsNumber(" e331(iii) ")).toBe("331(III)");
  });

  test("builds category fallback chain from deepest GSFA category", () => {
    expect(parentCategoryCodes("01.2.1.1")).toEqual([
      "01.2.1.1",
      "01.2.1",
      "01.2",
      "01.0",
    ]);
  });

  test("formats GMP sentinel limits without losing numeric parity", () => {
    expect(formatLimitValue(99_999)).toBe("GMP / quantum satis");
    expect(formatLimitValue(1500)).toBe("1,500 mg/kg");
  });
});
