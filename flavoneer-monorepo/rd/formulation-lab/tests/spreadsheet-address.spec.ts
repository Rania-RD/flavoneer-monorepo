import { expect, test } from "@playwright/test";
import {
  cellKeyToCoords,
  coordsToCellKey,
  expandRange,
} from "../lib/spreadsheet/cell-address";

test.describe("spreadsheet cell addresses", () => {
  test("converts A1, Z1, and AA1", () => {
    expect(cellKeyToCoords("A1")).toEqual({ row: 0, col: 0 });
    expect(cellKeyToCoords("Z1")).toEqual({ row: 0, col: 25 });
    expect(cellKeyToCoords("AA1")).toEqual({ row: 0, col: 26 });
    expect(coordsToCellKey(0, 26)).toBe("AA1");
  });

  test("expands ranges in row-major order", () => {
    expect(expandRange("A1:B3")).toEqual([
      "A1",
      "B1",
      "A2",
      "B2",
      "A3",
      "B3",
    ]);
  });

  test("rejects invalid keys", () => {
    expect(() => cellKeyToCoords("A0")).toThrow();
    expect(() => cellKeyToCoords("1A")).toThrow();
    expect(() => cellKeyToCoords("")).toThrow();
  });
});

