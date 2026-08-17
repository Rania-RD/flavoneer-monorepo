import { describe, expect, test } from "vitest";
import {
  DEMO_INSPECTION_COUNT,
  DEMO_LINE_HOURS,
  DEMO_OFFLINE_LINE_HOURS,
  DEMO_WEEK_HOURS,
  demoProductionSlot,
  productionLines,
} from "./e2eQualityReportSeedSchedule";

describe("QC report demo production schedule", () => {
  test("covers every line-hour in a seven-day 24/7 factory schedule", () => {
    const slots = Array.from({ length: DEMO_WEEK_HOURS }, (_, hourIndex) =>
      productionLines.map((_, lineIndex) => demoProductionSlot(hourIndex, lineIndex)),
    ).flat();

    expect(slots).toHaveLength(7 * 24 * productionLines.length);
    expect(DEMO_LINE_HOURS).toBe(504);
    expect(slots.filter((slot) => slot.status === "running")).toHaveLength(DEMO_INSPECTION_COUNT);
    expect(slots.filter((slot) => slot.status === "offline")).toHaveLength(DEMO_OFFLINE_LINE_HOURS);
    expect(DEMO_INSPECTION_COUNT).toBe(479);
    expect(DEMO_OFFLINE_LINE_HOURS).toBe(25);
  });

  test("assigns at most one product to a line and records both downtime reasons", () => {
    const runningProducts = new Set<string>();
    const downtimeReasons = new Set<string>();

    for (let hourIndex = 0; hourIndex < DEMO_WEEK_HOURS; hourIndex += 1) {
      for (let lineIndex = 0; lineIndex < productionLines.length; lineIndex += 1) {
        const slot = demoProductionSlot(hourIndex, lineIndex);
        if (slot.status === "running") {
          expect(slot.productName).toEqual(expect.any(String));
          runningProducts.add(slot.productName);
        } else {
          expect(slot).not.toHaveProperty("productName");
          downtimeReasons.add(slot.reason);
        }
      }
    }

    expect(runningProducts).toEqual(new Set(["Twin", "Icy Lemon", "Daymeh", "Rocky"]));
    expect(downtimeReasons).toEqual(new Set(["cleaning", "maintenance"]));
  });

  test("cleans BTC2 before each product change", () => {
    const btc2LineIndex = productionLines.findIndex((line) => line.departmentName === "BTC2");

    expect(demoProductionSlot(23, btc2LineIndex)).toEqual({
      status: "running",
      productName: "Daymeh",
    });
    expect(demoProductionSlot(24, btc2LineIndex)).toEqual({
      status: "offline",
      reason: "cleaning",
    });
    expect(demoProductionSlot(25, btc2LineIndex)).toEqual({
      status: "offline",
      reason: "cleaning",
    });
    expect(demoProductionSlot(26, btc2LineIndex)).toEqual({
      status: "running",
      productName: "Rocky",
    });
  });
});
