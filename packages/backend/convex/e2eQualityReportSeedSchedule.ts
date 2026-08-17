export const DEMO_WEEK_HOURS = 7 * 24;

export const productionLines = [
  { departmentName: "BTC1", hall: "A" as const, productNames: ["Twin"] as const },
  { departmentName: "Rollo A", hall: "A" as const, productNames: ["Icy Lemon"] as const },
  {
    departmentName: "BTC2",
    hall: "B" as const,
    productNames: ["Daymeh", "Rocky"] as const,
  },
] as const;

export type DemoProductName = (typeof productionLines)[number]["productNames"][number];

export type DemoProductionSlot =
  | { status: "running"; productName: DemoProductName }
  | { status: "offline"; reason: "cleaning" | "maintenance" };

/**
 * Returns the operating plan for one line-hour in the seven-day demo window.
 * Every running slot has one product. Offline slots intentionally have no QC
 * inspection because the hourly requirement only applies to active lines.
 */
export function demoProductionSlot(hourIndex: number, lineIndex: number): DemoProductionSlot {
  if (!Number.isInteger(hourIndex) || hourIndex < 0 || hourIndex >= DEMO_WEEK_HOURS) {
    throw new Error("Demo production hour is outside the seven-day schedule");
  }
  const line = productionLines[lineIndex];
  if (!line) {
    throw new Error("Demo production line does not exist");
  }

  if (line.departmentName === "BTC1" && hourIndex >= 72 && hourIndex < 78) {
    return { status: "offline", reason: "maintenance" };
  }
  if (
    line.departmentName === "Rollo A" &&
    ((hourIndex >= 44 && hourIndex < 47) || (hourIndex >= 126 && hourIndex < 130))
  ) {
    return {
      status: "offline",
      reason: hourIndex < 47 ? "cleaning" : "maintenance",
    };
  }
  if (line.departmentName === "BTC2") {
    const isProductChangeCleaning = hourIndex >= 24 && hourIndex % 24 < 2;
    if (isProductChangeCleaning) {
      return { status: "offline", reason: "cleaning" };
    }
    return {
      status: "running",
      productName: line.productNames[Math.floor(hourIndex / 24) % line.productNames.length],
    };
  }

  return { status: "running", productName: line.productNames[0] };
}

export const DEMO_LINE_HOURS = DEMO_WEEK_HOURS * productionLines.length;
export const DEMO_INSPECTION_COUNT = Array.from(
  { length: DEMO_WEEK_HOURS },
  (_, hourIndex) =>
    productionLines.filter(
      (_, lineIndex) => demoProductionSlot(hourIndex, lineIndex).status === "running",
    ).length,
).reduce((total, runningLines) => total + runningLines, 0);
export const DEMO_OFFLINE_LINE_HOURS = DEMO_LINE_HOURS - DEMO_INSPECTION_COUNT;
