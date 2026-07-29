import { expect, test } from "@playwright/test";
import {
  formatGsfaCategoryCode,
  formatGsfaCategoryLabel,
  matchesGsfaCategory,
} from "../lib/regulatory/gsfaCategory";

test.describe("GSFA category presentation", () => {
  test("normalizes major and top-level category codes", () => {
    expect(formatGsfaCategoryCode("1")).toBe("01.0");
    expect(formatGsfaCategoryCode("1.2.3")).toBe("01.2.3");
    expect(formatGsfaCategoryCode("01.0")).toBe("01.0");
    expect(formatGsfaCategoryCode("General")).toBe("General");
  });

  test("formats category labels without duplicated fallback names", () => {
    expect(
      formatGsfaCategoryLabel({
        code: "1.0",
        name: "Milk and dairy products",
      })
    ).toBe("01.0 · Milk and dairy products");
    expect(formatGsfaCategoryLabel({ code: "1.0", name: "1.0" })).toBe(
      "01.0"
    );
  });

  test("matches raw codes, formatted codes, and names", () => {
    const category = {
      code: "1.2.3",
      name: "Fermented dairy drinks",
    };

    expect(matchesGsfaCategory(category, "01.2")).toBe(true);
    expect(matchesGsfaCategory(category, "1.2.3")).toBe(true);
    expect(matchesGsfaCategory(category, "DAIRY")).toBe(true);
    expect(matchesGsfaCategory(category, "bakery")).toBe(false);
  });
});
