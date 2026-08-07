import { expect, test } from "@playwright/test";
import {
  buildTimezoneOption,
  getSupportedTimezones,
  matchesTimezone,
} from "../lib/timezones";

test.describe("timezone selection helpers", () => {
  test("includes the detected or saved timezone in the available options", () => {
    const options = getSupportedTimezones(
      "Antarctica/Troll",
      new Date("2026-01-15T12:00:00Z")
    );

    expect(options.some((option) => option.id === "Antarctica/Troll")).toBe(
      true
    );
    expect(options.some((option) => option.id === "UTC")).toBe(true);
  });

  test("formats IANA names for display and searches all visible metadata", () => {
    const timezone = buildTimezoneOption(
      "America/Argentina/Buenos_Aires",
      new Date("2026-01-15T12:00:00Z")
    );

    expect(timezone.city).toBe("Buenos Aires");
    expect(timezone.region).toBe("America / Argentina");
    expect(matchesTimezone(timezone, "buenos")).toBe(true);
    expect(matchesTimezone(timezone, "argentina")).toBe(true);
    expect(matchesTimezone(timezone, timezone.offset)).toBe(true);
    expect(matchesTimezone(timezone, "tokyo")).toBe(false);
  });
});
