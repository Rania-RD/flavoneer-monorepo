import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { requirePermission } from "./permissions";
import { productionHallCodeValidator, productionLineRecordStatusValidator } from "./validators";
import { requireWorkspaceMember } from "./workspaceAccess";

const STATISTICS_WINDOW_MS = 24 * 60 * 60 * 1000;
const LATEST_RECORD_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const MAXIMUM_INSPECTIONS = 5000;

const floorStatusValidator = v.union(
  v.literal("normal"),
  v.literal("pending"),
  v.literal("attention"),
);

const lineValidator = v.object({
  departmentName: v.string(),
  productionHallCode: productionHallCodeValidator,
  status: floorStatusValidator,
  latestInspection: v.object({
    recordId: v.id("productionLineRecords"),
    displaySerial: v.string(),
    inspectionAt: v.number(),
    printedBatchCode: v.optional(v.string()),
    productName: v.string(),
    qcUserName: v.string(),
    status: productionLineRecordStatusValidator,
    outOfLimitReadingCount: v.number(),
  }),
  statistics: v.object({
    inspections: v.number(),
    approved: v.number(),
    pending: v.number(),
    returned: v.number(),
    outOfLimit: v.number(),
    conformanceRate: v.number(),
  }),
});

function floorStatus(summary: Doc<"qualityInspectionSummaries">) {
  if (summary.status === "returned" || summary.outOfLimitReadingCount > 0) {
    return "attention" as const;
  }
  if (summary.status === "draft" || summary.status === "pending_production_review") {
    return "pending" as const;
  }
  return "normal" as const;
}

export function buildFloorLines(
  rows: Doc<"qualityInspectionSummaries">[],
  statisticsWindowStartsAt: number,
) {
  const groups = new Map<string, Doc<"qualityInspectionSummaries">[]>();
  for (const row of rows) {
    const key = `${row.productionHallCode}:${row.departmentName.trim().toLocaleLowerCase()}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  return [...groups.values()]
    .flatMap((group) => {
      const latest = group[0];
      if (!latest) {
        return [];
      }
      const statisticsRows = group.filter((row) => row.inspectionAt >= statisticsWindowStartsAt);
      const approved = statisticsRows.filter((row) => row.status === "approved").length;
      const conforming = statisticsRows.filter((row) => row.outOfLimitReadingCount === 0).length;
      return [
        {
          departmentName: latest.departmentName,
          productionHallCode: latest.productionHallCode,
          status: floorStatus(latest),
          latestInspection: {
            recordId: latest.recordId,
            displaySerial: latest.displaySerial,
            inspectionAt: latest.inspectionAt,
            printedBatchCode: latest.printedBatchCode,
            productName: latest.productName,
            qcUserName: latest.qcUserName,
            status: latest.status,
            outOfLimitReadingCount: latest.outOfLimitReadingCount,
          },
          statistics: {
            inspections: statisticsRows.length,
            approved,
            pending: statisticsRows.filter(
              (row) => row.status === "draft" || row.status === "pending_production_review",
            ).length,
            returned: statisticsRows.filter((row) => row.status === "returned").length,
            outOfLimit: statisticsRows.filter((row) => row.outOfLimitReadingCount > 0).length,
            conformanceRate: statisticsRows.length === 0 ? 0 : conforming / statisticsRows.length,
          },
        },
      ];
    })
    .sort((a, b) =>
      `${a.productionHallCode}:${a.departmentName}`.localeCompare(
        `${b.productionHallCode}:${b.departmentName}`,
      ),
    );
}

export const getOverview = query({
  args: {
    organizationId: v.id("organizations"),
    now: v.number(),
  },
  returns: v.object({
    generatedAt: v.number(),
    statisticsWindowStartsAt: v.number(),
    lines: v.array(lineValidator),
  }),
  handler: async (ctx, args) => {
    if (!Number.isFinite(args.now)) {
      throw new Error("Floor overview time must be a finite timestamp");
    }
    await requireWorkspaceMember(ctx, args.organizationId);
    await requirePermission(ctx, args.organizationId, "view_production_checks");

    const statisticsWindowStartsAt = args.now - STATISTICS_WINDOW_MS;
    const recentWindowStartsAt = args.now - LATEST_RECORD_WINDOW_MS;
    const rows = await ctx.db
      .query("qualityInspectionSummaries")
      .withIndex("by_organizationId_and_inspectionAt", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .gte("inspectionAt", recentWindowStartsAt)
          .lte("inspectionAt", args.now),
      )
      .order("desc")
      .take(MAXIMUM_INSPECTIONS + 1);

    if (rows.length > MAXIMUM_INSPECTIONS) {
      throw new Error("The production floor contains too many recent inspections to summarize");
    }

    return {
      generatedAt: args.now,
      statisticsWindowStartsAt,
      lines: buildFloorLines(rows, statisticsWindowStartsAt),
    };
  },
});
