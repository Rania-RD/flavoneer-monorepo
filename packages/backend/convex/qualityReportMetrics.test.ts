import { describe, expect, test } from "vitest";
import {
  distanceBeyondLimit,
  median,
  observedCpk,
  percentile,
  ratio,
} from "./qualityReportMetrics";

describe("quality report metrics", () => {
  test("returns safe ratios and medians", () => {
    expect(ratio(4, 5)).toBe(0.8);
    expect(ratio(0, 0)).toBe(0);
    expect(median([])).toBeNull();
    expect(median([9, 1, 5])).toBe(5);
    expect(median([1, 3, 7, 9])).toBe(5);
  });

  test("uses nearest-rank percentiles", () => {
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9)).toBe(9);
    expect(() => percentile([1], 0)).toThrow("Percentile");
  });

  test("calculates distance outside the stored specification limits", () => {
    expect(distanceBeyondLimit(8, 10, 20)).toBe(-2);
    expect(distanceBeyondLimit(15, 10, 20)).toBe(0);
    expect(distanceBeyondLimit(23, 10, 20)).toBe(3);
  });

  test("only exposes observed Cpk for a sufficiently large, variable sample", () => {
    expect(
      observedCpk(
        Array.from({ length: 29 }, () => 5),
        0,
        10,
      ),
    ).toBeNull();
    expect(
      observedCpk(
        Array.from({ length: 30 }, () => 5),
        0,
        10,
      ),
    ).toBeNull();
    const values = Array.from({ length: 30 }, (_, index) => 4.5 + (index % 6) * 0.2);
    expect(observedCpk(values, 0, 10)).toBeGreaterThan(1);
  });
});
