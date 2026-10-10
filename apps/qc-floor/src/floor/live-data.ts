import type { api } from "@flavoneer/backend/api";
import type { FunctionReturnType } from "convex/server";
import type { HallLayout } from "./types";

export type ProductionFloorOverview = FunctionReturnType<typeof api.productionFloor.getOverview>;
export type ProductionLineOverview = ProductionFloorOverview["lines"][number];

export function normalizeLineName(line: string) {
  return line.toLocaleLowerCase().replace(/[^a-z0-9\p{L}]+/gu, "");
}

export function findLineOverview(
  overview: ProductionFloorOverview | undefined,
  line: string,
): ProductionLineOverview | undefined {
  const key = normalizeLineName(line);
  return overview?.lines.find((item) => normalizeLineName(item.departmentName) === key);
}

export function applyLiveStatuses(
  layout: HallLayout,
  overview: ProductionFloorOverview | undefined,
): HallLayout {
  const statusForLine = (line: string) => findLineOverview(overview, line)?.status ?? "unknown";

  return {
    ...layout,
    lineZones: layout.lineZones.map((zone) => ({
      ...zone,
      status: statusForLine(zone.label),
    })),
    equipment: layout.equipment.map((equipment) =>
      equipment.selectable === false
        ? equipment
        : { ...equipment, status: statusForLine(equipment.line) },
    ),
  };
}
