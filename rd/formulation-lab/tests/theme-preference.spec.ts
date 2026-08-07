import { expect, test } from "@playwright/test";
import {
  normalizeThemePreference,
  resolveDarkMode,
} from "../lib/theme-preference";

test.describe("theme preference", () => {
  test("keeps a supported preference", () => {
    expect(normalizeThemePreference("system", false)).toBe("system");
    expect(normalizeThemePreference("dark", false)).toBe("dark");
  });

  test("converts the legacy dark mode setting", () => {
    expect(normalizeThemePreference(undefined, true)).toBe("dark");
    expect(normalizeThemePreference(undefined, false)).toBe("light");
  });

  test("resolves system mode from the operating system", () => {
    expect(resolveDarkMode("system", true)).toBe(true);
    expect(resolveDarkMode("system", false)).toBe(false);
    expect(resolveDarkMode("light", true)).toBe(false);
  });
});
