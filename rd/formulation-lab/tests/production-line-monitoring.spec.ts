import {
  buildDisplaySerial,
  buildInspectionHourKey,
  parsePrintedBatchCode,
} from "@flavoneer/backend/production-line";
import { expect, test } from "@playwright/test";

test.describe("production-line record identity", () => {
  test("parses the confirmed pilot batch code format", () => {
    expect(parsePrintedBatchCode("  060826   1 ")).toEqual({
      dailyBatchSequence: 1,
      labelProductionDate: "2026-08-06",
      normalizedCode: "060826 1",
    });
  });

  test("rejects invalid dates and sequences outside 1 through 9", () => {
    expect(() => parsePrintedBatchCode("310226 1")).toThrow(
      "invalid production date"
    );
    expect(() => parsePrintedBatchCode("060826 0")).toThrow("DDMMYY N");
    expect(() => parsePrintedBatchCode("060826 10")).toThrow("DDMMYY N");
  });

  test("builds stable organization-local hourly keys", () => {
    const inspectionAt = Date.parse("2026-08-06T22:30:00.000Z");
    expect(buildInspectionHourKey(inspectionAt, "Asia/Gaza")).toBe(
      "2026-08-07T01"
    );
  });

  test("formats hall-prefixed serial numbers", () => {
    expect(buildDisplaySerial("A", 1126)).toBe("A 1126");
    expect(buildDisplaySerial("B", 1233)).toBe("B 1233");
    expect(() => buildDisplaySerial("A", 0)).toThrow("positive integer");
  });
});
