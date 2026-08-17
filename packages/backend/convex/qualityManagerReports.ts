import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { requirePermission } from "./permissions";
import {
  distanceBeyondLimit,
  median,
  observedCpk,
  percentile,
  ratio,
} from "./qualityReportMetrics";
import {
  productionHallCodeValidator,
  productionLineCheckKeyValidator,
  productionLineMeasurementUnitValidator,
  productionLineReadingKeyValidator,
  productionLineRecordStatusValidator,
} from "./validators";
import { requireWorkspaceMember } from "./workspaceAccess";

const MAXIMUM_INTERACTIVE_RANGE_MS = 90 * 24 * 60 * 60 * 1000;
const MAXIMUM_REPORT_ROWS = 5000;
const MAXIMUM_CHART_POINTS = 2000;

const reportFilterValidator = v.object({
  organizationId: v.id("organizations"),
  from: v.number(),
  to: v.number(),
  now: v.number(),
  productId: v.optional(v.id("projects")),
  productionHallCode: v.optional(productionHallCodeValidator),
  departmentName: v.optional(v.string()),
  qcUserId: v.optional(v.string()),
  status: v.optional(productionLineRecordStatusValidator),
  specificationVersion: v.optional(v.number()),
});

type ReportFilters = {
  organizationId: Id<"organizations">;
  from: number;
  to: number;
  now: number;
  productId?: Id<"projects">;
  productionHallCode?: "A" | "B";
  departmentName?: string;
  qcUserId?: string;
  status?: Doc<"productionLineRecords">["status"];
  specificationVersion?: number;
};

const nullableNumberValidator = v.union(v.number(), v.null());

function validateRange(args: Pick<ReportFilters, "from" | "to" | "now">) {
  if (![args.from, args.to, args.now].every(Number.isFinite)) {
    throw new Error("Report dates must be finite timestamps");
  }
  if (args.to <= args.from) {
    throw new Error("Report end date must be after the start date");
  }
  if (args.to - args.from > MAXIMUM_INTERACTIVE_RANGE_MS) {
    throw new Error("Interactive QC reports are limited to 90 days");
  }
}

async function authorize(ctx: QueryCtx, organizationId: Id<"organizations">) {
  await requireWorkspaceMember(ctx, organizationId);
  await requirePermission(ctx, organizationId, "review_production_checks");
}

function matchesFilters(summary: Doc<"qualityInspectionSummaries">, args: ReportFilters) {
  return (
    (!args.productId || summary.productId === args.productId) &&
    (!args.productionHallCode || summary.productionHallCode === args.productionHallCode) &&
    (!args.departmentName || summary.departmentName === args.departmentName) &&
    (!args.qcUserId || summary.qcUserId === args.qcUserId) &&
    (!args.status || summary.status === args.status) &&
    (args.specificationVersion === undefined ||
      summary.specificationVersion === args.specificationVersion)
  );
}

async function getInspectionSummaries(ctx: QueryCtx, args: ReportFilters) {
  validateRange(args);
  const rows = await ctx.db
    .query("qualityInspectionSummaries")
    .withIndex("by_organizationId_and_inspectionAt", (q) =>
      q
        .eq("organizationId", args.organizationId)
        .gte("inspectionAt", args.from)
        .lt("inspectionAt", args.to),
    )
    .take(MAXIMUM_REPORT_ROWS + 1);
  if (rows.length > MAXIMUM_REPORT_ROWS) {
    throw new Error("This report range contains too many inspections; use a narrower range");
  }
  return rows.filter((row) => matchesFilters(row, args));
}

async function getReadingFacts(
  ctx: QueryCtx,
  args: ReportFilters,
  readingKey?: Doc<"qualityReadingFacts">["readingKey"],
) {
  validateRange(args);
  const rows = readingKey
    ? await ctx.db
        .query("qualityReadingFacts")
        .withIndex("by_organizationId_and_readingKey_and_inspectionAt", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("readingKey", readingKey)
            .gte("inspectionAt", args.from)
            .lt("inspectionAt", args.to),
        )
        .take(MAXIMUM_REPORT_ROWS + 1)
    : await ctx.db
        .query("qualityReadingFacts")
        .withIndex("by_organizationId_and_inspectionAt", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .gte("inspectionAt", args.from)
            .lt("inspectionAt", args.to),
        )
        .take(MAXIMUM_REPORT_ROWS + 1);
  if (rows.length > MAXIMUM_REPORT_ROWS) {
    throw new Error("This report range contains too many readings; use a narrower range");
  }
  const filteredRows = rows.filter(
    (row) =>
      (!args.productId || row.productId === args.productId) &&
      (!args.productionHallCode || row.productionHallCode === args.productionHallCode) &&
      (!args.departmentName || row.departmentName === args.departmentName) &&
      (!args.qcUserId || row.qcUserId === args.qcUserId) &&
      (args.specificationVersion === undefined ||
        row.specificationVersion === args.specificationVersion),
  );
  if (!args.status) {
    return filteredRows;
  }
  const recordIds = new Set(
    (await getInspectionSummaries(ctx, args)).map((summary) => summary.recordId),
  );
  return filteredRows.filter((row) => recordIds.has(row.recordId));
}

async function getReviewCycles(ctx: QueryCtx, args: ReportFilters) {
  validateRange(args);
  const rows = await ctx.db
    .query("qualityReviewCycles")
    .withIndex("by_organizationId_and_submittedAt", (q) =>
      q
        .eq("organizationId", args.organizationId)
        .gte("submittedAt", args.from)
        .lt("submittedAt", args.to),
    )
    .take(MAXIMUM_REPORT_ROWS + 1);
  if (rows.length > MAXIMUM_REPORT_ROWS) {
    throw new Error("This report range contains too many review cycles; use a narrower range");
  }
  const filteredRows = rows.filter(
    (row) =>
      (!args.productId || row.productId === args.productId) &&
      (!args.productionHallCode || row.productionHallCode === args.productionHallCode) &&
      (!args.departmentName || row.departmentName === args.departmentName) &&
      (!args.qcUserId || row.qcUserId === args.qcUserId),
  );
  if (!args.status && args.specificationVersion === undefined) {
    return filteredRows;
  }
  const recordIds = new Set(
    (await getInspectionSummaries(ctx, args)).map((summary) => summary.recordId),
  );
  return filteredRows.filter((row) => recordIds.has(row.recordId));
}

function localHourKey(timestamp: number, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}`;
}

type ComparisonGroup = "product" | "hall" | "department" | "specification";

function buildOverviewReport(
  rows: Doc<"qualityInspectionSummaries">[],
  timezone: string,
  sourceRows: Doc<"productionLineRecords">[],
  args: ReportFilters,
) {
  const pendingAges = rows
    .filter((row) => row.status === "pending_production_review" && row.lastSubmittedAt)
    .map((row) => Math.max(0, args.now - (row.lastSubmittedAt ?? args.now)));
  const timelineMap = new Map<
    string,
    { key: string; draft: number; pending: number; returned: number; approved: number }
  >();
  for (const row of rows) {
    const key = localHourKey(row.inspectionAt, timezone);
    const bucket = timelineMap.get(key) ?? {
      key,
      draft: 0,
      pending: 0,
      returned: 0,
      approved: 0,
    };
    if (row.status === "pending_production_review") {
      bucket.pending += 1;
    } else {
      bucket[row.status] += 1;
    }
    timelineMap.set(key, bucket);
  }
  const exceptions = rows
    .filter(
      (row) =>
        row.outOfLimitReadingCount > 0 ||
        row.status === "pending_production_review" ||
        row.status === "returned",
    )
    .map((row) => ({
      recordId: row.recordId,
      displaySerial: row.displaySerial,
      productName: row.productName,
      productionHallCode: row.productionHallCode,
      departmentName: row.departmentName,
      printedBatchCode: row.printedBatchCode,
      qcUserName: row.qcUserName,
      inspectionAt: row.inspectionAt,
      status: row.status,
      outOfLimitReadingCount: row.outOfLimitReadingCount,
      outOfLimitReadingKeys: row.outOfLimitReadingKeys,
      pendingAgeMs:
        row.status === "pending_production_review" && row.lastSubmittedAt
          ? Math.max(0, args.now - row.lastSubmittedAt)
          : null,
    }))
    .sort(
      (a, b) =>
        Number(b.outOfLimitReadingCount > 0) - Number(a.outOfLimitReadingCount > 0) ||
        (b.pendingAgeMs ?? 0) - (a.pendingAgeMs ?? 0) ||
        b.inspectionAt - a.inspectionAt,
    )
    .slice(0, 100);
  const summarizedRecordIds = new Set(rows.map((row) => row.recordId));
  return {
    totals: {
      inspections: rows.length,
      drafts: rows.filter((row) => row.status === "draft").length,
      pending: rows.filter((row) => row.status === "pending_production_review").length,
      returned: rows.filter((row) => row.status === "returned").length,
      approved: rows.filter((row) => row.status === "approved").length,
      outOfLimitRecords: rows.filter((row) => row.outOfLimitReadingCount > 0).length,
      medianPendingAgeMs: median(pendingAges),
      oldestPendingAgeMs: pendingAges.length > 0 ? Math.max(...pendingAges) : null,
    },
    timeline: [...timelineMap.values()].sort((a, b) => a.key.localeCompare(b.key)),
    exceptions,
    awaitingBackfill: sourceRows.filter(
      (source) =>
        source.inspectionAt >= args.from &&
        source.inspectionAt < args.to &&
        !summarizedRecordIds.has(source._id),
    ).length,
  };
}

function buildReadinessReport(summaries: Doc<"qualityInspectionSummaries">[], args: ReportFilters) {
  const rows = summaries.filter((row) => row.status === "draft" || row.status === "returned");
  const withMissing = rows.map((row) => {
    const missing: string[] = [];
    if (!row.hasBatchLabelPhoto) missing.push("batch_label_photo");
    if (!row.hasConfirmedBatchCode) missing.push("batch_code_confirmation");
    if (row.completedReadingRequirementCount < row.requiredReadingRequirementCount) {
      missing.push("required_measurements");
    }
    if (row.completedCheckCount < row.requiredCheckCount) missing.push("compliance_checks");
    return { row, missing, ageMs: Math.max(0, args.now - row.updatedAt) };
  });
  const draftAges = rows
    .filter((row) => row.status === "draft")
    .map((row) => Math.max(0, args.now - row.createdAt));
  return {
    totals: {
      openRecords: rows.length,
      drafts: rows.filter((row) => row.status === "draft").length,
      returned: rows.filter((row) => row.status === "returned").length,
      medianDraftAgeMs: median(draftAges),
      oldestStalledAgeMs:
        withMissing.length > 0 ? Math.max(...withMissing.map((item) => item.ageMs)) : null,
      photoCoverage: ratio(rows.filter((row) => row.hasBatchLabelPhoto).length, rows.length),
      codeCoverage: ratio(rows.filter((row) => row.hasConfirmedBatchCode).length, rows.length),
      readingCoverage: ratio(
        rows.filter(
          (row) => row.completedReadingRequirementCount >= row.requiredReadingRequirementCount,
        ).length,
        rows.length,
      ),
      checkCoverage: ratio(
        rows.filter((row) => row.completedCheckCount >= row.requiredCheckCount).length,
        rows.length,
      ),
    },
    missingRequirements: {
      batchLabelPhoto: rows.filter((row) => !row.hasBatchLabelPhoto).length,
      batchCodeConfirmation: rows.filter((row) => !row.hasConfirmedBatchCode).length,
      requiredMeasurements: rows.filter(
        (row) => row.completedReadingRequirementCount < row.requiredReadingRequirementCount,
      ).length,
      complianceChecks: rows.filter((row) => row.completedCheckCount < row.requiredCheckCount)
        .length,
    },
    stalledRecords: withMissing
      .sort((a, b) => b.ageMs - a.ageMs)
      .slice(0, 200)
      .map(({ row, missing, ageMs }) => ({
        recordId: row.recordId,
        displaySerial: row.displaySerial,
        productName: row.productName,
        productionHallCode: row.productionHallCode,
        departmentName: row.departmentName,
        qcUserName: row.qcUserName,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        ageMs,
        missing,
      })),
  };
}

function buildComparisonReport(
  summaries: Doc<"qualityInspectionSummaries">[],
  readings: Doc<"qualityReadingFacts">[],
  cycles: Doc<"qualityReviewCycles">[],
  groupBy: ComparisonGroup,
) {
  const keyFor = (row: Doc<"qualityInspectionSummaries">) => {
    if (groupBy === "product") return { key: row.productId, label: row.productName };
    if (groupBy === "hall") {
      return { key: row.productionHallCode, label: row.productionHallCode };
    }
    if (groupBy === "department") {
      return { key: row.departmentName, label: row.departmentName };
    }
    return { key: String(row.specificationVersion), label: `v${row.specificationVersion}` };
  };
  const groups = new Map<string, { label: string; rows: Doc<"qualityInspectionSummaries">[] }>();
  for (const row of summaries) {
    const { key, label } = keyFor(row);
    const current = groups.get(key) ?? { label, rows: [] };
    current.rows.push(row);
    groups.set(key, current);
  }
  const completedCycles = cycles.filter(
    (cycle) => cycle.decision && cycle.durationMs !== undefined,
  );
  const groupRows = [...groups.entries()].map(([key, group]) => {
    const recordIds = new Set(group.rows.map((row) => row.recordId));
    const groupReadings = readings.filter((reading) => recordIds.has(reading.recordId));
    const groupCycles = completedCycles.filter((cycle) => recordIds.has(cycle.recordId));
    const reviewedRecords = group.rows.filter((row) => row.firstReviewDecision !== undefined);
    return {
      key,
      label: group.label,
      inspections: group.rows.length,
      approved: group.rows.filter((row) => row.status === "approved").length,
      returned: group.rows.filter((row) => row.status === "returned").length,
      outOfLimitRecords: group.rows.filter((row) => row.outOfLimitReadingCount > 0).length,
      outOfLimitRate: ratio(
        group.rows.filter((row) => row.outOfLimitReadingCount > 0).length,
        group.rows.filter((row) => row.totalReadingCount > 0).length,
      ),
      readingConformanceRate: ratio(
        groupReadings.filter((reading) => reading.withinLimit).length,
        groupReadings.length,
      ),
      firstPassApprovalRate: ratio(
        reviewedRecords.filter((row) => row.firstReviewDecision === "approved").length,
        reviewedRecords.length,
      ),
      medianReviewTimeMs: median(
        groupCycles.flatMap((cycle) => (cycle.durationMs === undefined ? [] : [cycle.durationMs])),
      ),
      lowSample: group.rows.length < 10,
    };
  });
  const reviewed = summaries.filter((row) => row.firstReviewDecision !== undefined);
  return {
    baseline: {
      inspections: summaries.length,
      outOfLimitRate: ratio(
        summaries.filter((row) => row.outOfLimitReadingCount > 0).length,
        summaries.filter((row) => row.totalReadingCount > 0).length,
      ),
      readingConformanceRate: ratio(
        readings.filter((reading) => reading.withinLimit).length,
        readings.length,
      ),
      firstPassApprovalRate: ratio(
        reviewed.filter((row) => row.firstReviewDecision === "approved").length,
        reviewed.length,
      ),
    },
    groups: groupRows.sort(
      (a, b) =>
        Number(a.lowSample) - Number(b.lowSample) ||
        b.outOfLimitRate - a.outOfLimitRate ||
        b.inspections - a.inspections,
    ),
  };
}

function buildWorkflowReport(
  summaries: Doc<"qualityInspectionSummaries">[],
  cycles: Doc<"qualityReviewCycles">[],
  args: ReportFilters,
) {
  const completed = cycles.filter(
    (cycle) => cycle.decision !== undefined && cycle.durationMs !== undefined,
  );
  const pending = cycles.filter((cycle) => cycle.decision === undefined);
  const inspectorIds = new Set([
    ...summaries.map((row) => row.qcUserId),
    ...cycles.map((cycle) => cycle.qcUserId),
  ]);
  const inspectors = [...inspectorIds].map((id) => {
    const owned = summaries.filter((row) => row.qcUserId === id);
    const ownedCycles = cycles.filter((cycle) => cycle.qcUserId === id);
    const reviewed = owned.filter((row) => row.firstReviewDecision !== undefined);
    const createToSubmit = owned.flatMap((row) =>
      row.firstSubmittedAt === undefined ? [] : [Math.max(0, row.firstSubmittedAt - row.createdAt)],
    );
    return {
      id,
      name: owned[0]?.qcUserName ?? ownedCycles[0]?.qcUserName ?? "Unknown",
      assigned: owned.length,
      submitted: ownedCycles.length,
      drafts: owned.filter((row) => row.status === "draft").length,
      returned: owned.filter((row) => row.status === "returned").length,
      reviewed: reviewed.length,
      firstPassApprovals: reviewed.filter((row) => row.firstReviewDecision === "approved").length,
      firstPassApprovalRate: ratio(
        reviewed.filter((row) => row.firstReviewDecision === "approved").length,
        reviewed.length,
      ),
      medianCreateToSubmitMs: median(createToSubmit),
    };
  });
  const reviewerMap = new Map<string, typeof completed>();
  for (const cycle of completed) {
    if (!cycle.reviewerId) continue;
    const rows = reviewerMap.get(cycle.reviewerId) ?? [];
    rows.push(cycle);
    reviewerMap.set(cycle.reviewerId, rows);
  }
  return {
    totals: {
      submissions: cycles.length,
      decisions: completed.length,
      approvals: completed.filter((cycle) => cycle.decision === "approved").length,
      returns: completed.filter((cycle) => cycle.decision === "returned").length,
      pending: pending.length,
      medianReviewTimeMs: median(completed.map((cycle) => cycle.durationMs ?? 0)),
      p90ReviewTimeMs: percentile(
        completed.map((cycle) => cycle.durationMs ?? 0),
        0.9,
      ),
      oldestPendingAgeMs:
        pending.length > 0
          ? Math.max(...pending.map((cycle) => Math.max(0, args.now - cycle.submittedAt)))
          : null,
    },
    inspectors: inspectors.sort((a, b) => b.assigned - a.assigned),
    reviewers: [...reviewerMap.entries()]
      .map(([id, rows]) => ({
        id,
        name: rows[0]?.reviewerName ?? "Unknown",
        decisions: rows.length,
        approvals: rows.filter((row) => row.decision === "approved").length,
        returns: rows.filter((row) => row.decision === "returned").length,
        medianReviewTimeMs: median(rows.map((row) => row.durationMs ?? 0)),
      }))
      .sort((a, b) => b.decisions - a.decisions),
  };
}

export const getFilterOptions = query({
  args: reportFilterValidator.pick("organizationId", "from", "to").fields,
  returns: v.object({
    products: v.array(v.object({ id: v.id("projects"), name: v.string() })),
    productionHallCodes: v.array(productionHallCodeValidator),
    departmentNames: v.array(v.string()),
    qcUsers: v.array(v.object({ id: v.string(), name: v.string() })),
    specificationVersions: v.array(v.number()),
  }),
  handler: async (ctx, args) => {
    await authorize(ctx, args.organizationId);
    const rows = await getInspectionSummaries(ctx, { ...args, now: args.to });
    return {
      products: [
        ...new Map(
          rows.map((row) => [row.productId, { id: row.productId, name: row.productName }]),
        ).values(),
      ].sort((a, b) => a.name.localeCompare(b.name)),
      productionHallCodes: [...new Set(rows.map((row) => row.productionHallCode))].sort(),
      departmentNames: [...new Set(rows.map((row) => row.departmentName))].sort(),
      qcUsers: [
        ...new Map(
          rows.map((row) => [row.qcUserId, { id: row.qcUserId, name: row.qcUserName }]),
        ).values(),
      ].sort((a, b) => a.name.localeCompare(b.name)),
      specificationVersions: [...new Set(rows.map((row) => row.specificationVersion))].sort(
        (a, b) => a - b,
      ),
    };
  },
});

const exceptionRowValidator = v.object({
  recordId: v.id("productionLineRecords"),
  displaySerial: v.string(),
  productName: v.string(),
  productionHallCode: productionHallCodeValidator,
  departmentName: v.string(),
  printedBatchCode: v.optional(v.string()),
  qcUserName: v.string(),
  inspectionAt: v.number(),
  status: productionLineRecordStatusValidator,
  outOfLimitReadingCount: v.number(),
  outOfLimitReadingKeys: v.array(productionLineReadingKeyValidator),
  pendingAgeMs: nullableNumberValidator,
});

export const getOverview = query({
  args: reportFilterValidator.fields,
  returns: v.object({
    totals: v.object({
      inspections: v.number(),
      drafts: v.number(),
      pending: v.number(),
      returned: v.number(),
      approved: v.number(),
      outOfLimitRecords: v.number(),
      medianPendingAgeMs: nullableNumberValidator,
      oldestPendingAgeMs: nullableNumberValidator,
    }),
    timeline: v.array(
      v.object({
        key: v.string(),
        draft: v.number(),
        pending: v.number(),
        returned: v.number(),
        approved: v.number(),
      }),
    ),
    exceptions: v.array(exceptionRowValidator),
    awaitingBackfill: v.number(),
  }),
  handler: async (ctx, args) => {
    await authorize(ctx, args.organizationId);
    const [rows, settings, sourceRows] = await Promise.all([
      getInspectionSummaries(ctx, { ...args }),
      ctx.db
        .query("productionLineSettings")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
        .unique(),
      ctx.db
        .query("productionLineRecords")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
        .order("desc")
        .take(250),
    ]);
    return buildOverviewReport(rows, settings?.timezone ?? "UTC", sourceRows, args);
  },
});

const measurementPointValidator = v.object({
  recordId: v.id("productionLineRecords"),
  displaySerial: v.string(),
  productName: v.string(),
  printedBatchCode: v.optional(v.string()),
  inspectionAt: v.number(),
  readingKey: productionLineReadingKeyValidator,
  readingIndex: v.number(),
  value: v.number(),
  unit: productionLineMeasurementUnitValidator,
  minimum: v.number(),
  maximum: v.number(),
  target: v.optional(v.number()),
  withinLimit: v.boolean(),
  distanceBeyondLimit: v.number(),
  qcUserName: v.string(),
  specificationVersion: v.number(),
});

export const getMeasurementConformance = query({
  args: reportFilterValidator.extend({ readingKey: v.optional(productionLineReadingKeyValidator) })
    .fields,
  returns: v.object({
    totals: v.object({
      readings: v.number(),
      inLimit: v.number(),
      outOfLimit: v.number(),
      conformanceRate: v.number(),
      records: v.number(),
      conformingRecords: v.number(),
      recordConformanceRate: v.number(),
    }),
    parameters: v.array(
      v.object({
        readingKey: productionLineReadingKeyValidator,
        readings: v.number(),
        inLimit: v.number(),
        outOfLimit: v.number(),
        conformanceRate: v.number(),
      }),
    ),
    points: v.array(measurementPointValidator),
    outliers: v.array(measurementPointValidator),
    cpk: nullableNumberValidator,
    cpkEligible: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await authorize(ctx, args.organizationId);
    const rows = await getReadingFacts(ctx, { ...args }, args.readingKey);
    const recordIds = new Set(rows.map((row) => row.recordId));
    const conformingRecordIds = new Set(
      [...recordIds].filter(
        (recordId) => !rows.some((row) => row.recordId === recordId && !row.withinLimit),
      ),
    );
    const parameterMap = new Map<
      string,
      {
        readingKey: Doc<"qualityReadingFacts">["readingKey"];
        readings: number;
        inLimit: number;
        outOfLimit: number;
      }
    >();
    for (const row of rows) {
      const aggregate = parameterMap.get(row.readingKey) ?? {
        readingKey: row.readingKey,
        readings: 0,
        inLimit: 0,
        outOfLimit: 0,
      };
      aggregate.readings += 1;
      aggregate[row.withinLimit ? "inLimit" : "outOfLimit"] += 1;
      parameterMap.set(row.readingKey, aggregate);
    }
    const points = rows.slice(0, MAXIMUM_CHART_POINTS).map((row) => ({
      recordId: row.recordId,
      displaySerial: row.displaySerial,
      productName: row.productName,
      printedBatchCode: row.printedBatchCode,
      inspectionAt: row.inspectionAt,
      readingKey: row.readingKey,
      readingIndex: row.readingIndex,
      value: row.value,
      unit: row.unit,
      minimum: row.minimum,
      maximum: row.maximum,
      target: row.target,
      withinLimit: row.withinLimit,
      distanceBeyondLimit: distanceBeyondLimit(row.value, row.minimum, row.maximum),
      qcUserName: row.qcUserName,
      specificationVersion: row.specificationVersion,
    }));
    const capabilityRows =
      args.readingKey && args.productId && args.specificationVersion !== undefined ? rows : [];
    const sameLimits =
      capabilityRows.length >= 30 &&
      capabilityRows.every(
        (row) =>
          row.minimum === capabilityRows[0].minimum && row.maximum === capabilityRows[0].maximum,
      );
    return {
      totals: {
        readings: rows.length,
        inLimit: rows.filter((row) => row.withinLimit).length,
        outOfLimit: rows.filter((row) => !row.withinLimit).length,
        conformanceRate: ratio(rows.filter((row) => row.withinLimit).length, rows.length),
        records: recordIds.size,
        conformingRecords: conformingRecordIds.size,
        recordConformanceRate: ratio(conformingRecordIds.size, recordIds.size),
      },
      parameters: [...parameterMap.values()]
        .map((row) => ({ ...row, conformanceRate: ratio(row.inLimit, row.readings) }))
        .sort((a, b) => a.readingKey.localeCompare(b.readingKey)),
      points,
      outliers: points.filter((point) => !point.withinLimit).slice(0, 200),
      cpk:
        sameLimits && capabilityRows[0]
          ? observedCpk(
              capabilityRows.map((row) => row.value),
              capabilityRows[0].minimum,
              capabilityRows[0].maximum,
            )
          : null,
      cpkEligible: sameLimits,
    };
  },
});

export const getReadiness = query({
  args: reportFilterValidator.fields,
  returns: v.object({
    totals: v.object({
      openRecords: v.number(),
      drafts: v.number(),
      returned: v.number(),
      medianDraftAgeMs: nullableNumberValidator,
      oldestStalledAgeMs: nullableNumberValidator,
      photoCoverage: v.number(),
      codeCoverage: v.number(),
      readingCoverage: v.number(),
      checkCoverage: v.number(),
    }),
    missingRequirements: v.object({
      batchLabelPhoto: v.number(),
      batchCodeConfirmation: v.number(),
      requiredMeasurements: v.number(),
      complianceChecks: v.number(),
    }),
    stalledRecords: v.array(
      v.object({
        recordId: v.id("productionLineRecords"),
        displaySerial: v.string(),
        productName: v.string(),
        productionHallCode: productionHallCodeValidator,
        departmentName: v.string(),
        qcUserName: v.string(),
        status: productionLineRecordStatusValidator,
        createdAt: v.number(),
        updatedAt: v.number(),
        ageMs: v.number(),
        missing: v.array(v.string()),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await authorize(ctx, args.organizationId);
    return buildReadinessReport(await getInspectionSummaries(ctx, { ...args }), args);
  },
});

const comparisonGroupValidator = v.union(
  v.literal("product"),
  v.literal("hall"),
  v.literal("department"),
  v.literal("specification"),
);

export const getComparisons = query({
  args: reportFilterValidator.extend({ groupBy: comparisonGroupValidator }).fields,
  returns: v.object({
    baseline: v.object({
      inspections: v.number(),
      outOfLimitRate: v.number(),
      readingConformanceRate: v.number(),
      firstPassApprovalRate: v.number(),
    }),
    groups: v.array(
      v.object({
        key: v.string(),
        label: v.string(),
        inspections: v.number(),
        approved: v.number(),
        returned: v.number(),
        outOfLimitRecords: v.number(),
        outOfLimitRate: v.number(),
        readingConformanceRate: v.number(),
        firstPassApprovalRate: v.number(),
        medianReviewTimeMs: nullableNumberValidator,
        lowSample: v.boolean(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await authorize(ctx, args.organizationId);
    const [summaries, readings, cycles] = await Promise.all([
      getInspectionSummaries(ctx, { ...args }),
      getReadingFacts(ctx, { ...args }),
      getReviewCycles(ctx, { ...args }),
    ]);
    return buildComparisonReport(summaries, readings, cycles, args.groupBy);
  },
});

export const getWorkflow = query({
  args: reportFilterValidator.fields,
  returns: v.object({
    totals: v.object({
      submissions: v.number(),
      decisions: v.number(),
      approvals: v.number(),
      returns: v.number(),
      pending: v.number(),
      medianReviewTimeMs: nullableNumberValidator,
      p90ReviewTimeMs: nullableNumberValidator,
      oldestPendingAgeMs: nullableNumberValidator,
    }),
    inspectors: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        assigned: v.number(),
        submitted: v.number(),
        drafts: v.number(),
        returned: v.number(),
        reviewed: v.number(),
        firstPassApprovals: v.number(),
        firstPassApprovalRate: v.number(),
        medianCreateToSubmitMs: nullableNumberValidator,
      }),
    ),
    reviewers: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        decisions: v.number(),
        approvals: v.number(),
        returns: v.number(),
        medianReviewTimeMs: nullableNumberValidator,
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await authorize(ctx, args.organizationId);
    const [summaries, cycles] = await Promise.all([
      getInspectionSummaries(ctx, { ...args }),
      getReviewCycles(ctx, { ...args }),
    ]);
    return buildWorkflowReport(summaries, cycles, args);
  },
});

export const getManagerReport = query({
  args: reportFilterValidator.extend({ groupBy: comparisonGroupValidator }).fields,
  returns: v.object({
    overview: v.object({
      totals: v.object({
        inspections: v.number(),
        drafts: v.number(),
        pending: v.number(),
        returned: v.number(),
        approved: v.number(),
        outOfLimitRecords: v.number(),
        medianPendingAgeMs: nullableNumberValidator,
        oldestPendingAgeMs: nullableNumberValidator,
      }),
      timeline: v.array(
        v.object({
          key: v.string(),
          draft: v.number(),
          pending: v.number(),
          returned: v.number(),
          approved: v.number(),
        }),
      ),
      exceptions: v.array(exceptionRowValidator),
      awaitingBackfill: v.number(),
    }),
    readiness: v.object({
      totals: v.object({
        openRecords: v.number(),
        drafts: v.number(),
        returned: v.number(),
        medianDraftAgeMs: nullableNumberValidator,
        oldestStalledAgeMs: nullableNumberValidator,
        photoCoverage: v.number(),
        codeCoverage: v.number(),
        readingCoverage: v.number(),
        checkCoverage: v.number(),
      }),
      missingRequirements: v.object({
        batchLabelPhoto: v.number(),
        batchCodeConfirmation: v.number(),
        requiredMeasurements: v.number(),
        complianceChecks: v.number(),
      }),
      stalledRecords: v.array(
        v.object({
          recordId: v.id("productionLineRecords"),
          displaySerial: v.string(),
          productName: v.string(),
          productionHallCode: productionHallCodeValidator,
          departmentName: v.string(),
          qcUserName: v.string(),
          status: productionLineRecordStatusValidator,
          createdAt: v.number(),
          updatedAt: v.number(),
          ageMs: v.number(),
          missing: v.array(v.string()),
        }),
      ),
    }),
    comparison: v.object({
      baseline: v.object({
        inspections: v.number(),
        outOfLimitRate: v.number(),
        readingConformanceRate: v.number(),
        firstPassApprovalRate: v.number(),
      }),
      groups: v.array(
        v.object({
          key: v.string(),
          label: v.string(),
          inspections: v.number(),
          approved: v.number(),
          returned: v.number(),
          outOfLimitRecords: v.number(),
          outOfLimitRate: v.number(),
          readingConformanceRate: v.number(),
          firstPassApprovalRate: v.number(),
          medianReviewTimeMs: nullableNumberValidator,
          lowSample: v.boolean(),
        }),
      ),
    }),
    workflow: v.object({
      totals: v.object({
        submissions: v.number(),
        decisions: v.number(),
        approvals: v.number(),
        returns: v.number(),
        pending: v.number(),
        medianReviewTimeMs: nullableNumberValidator,
        p90ReviewTimeMs: nullableNumberValidator,
        oldestPendingAgeMs: nullableNumberValidator,
      }),
      inspectors: v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          assigned: v.number(),
          submitted: v.number(),
          drafts: v.number(),
          returned: v.number(),
          reviewed: v.number(),
          firstPassApprovals: v.number(),
          firstPassApprovalRate: v.number(),
          medianCreateToSubmitMs: nullableNumberValidator,
        }),
      ),
      reviewers: v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          decisions: v.number(),
          approvals: v.number(),
          returns: v.number(),
          medianReviewTimeMs: nullableNumberValidator,
        }),
      ),
    }),
  }),
  handler: async (ctx, args) => {
    await authorize(ctx, args.organizationId);
    const [summaries, readings, cycles, settings, sourceRows] = await Promise.all([
      getInspectionSummaries(ctx, { ...args }),
      getReadingFacts(ctx, { ...args, status: undefined }),
      getReviewCycles(ctx, {
        ...args,
        specificationVersion: undefined,
        status: undefined,
      }),
      ctx.db
        .query("productionLineSettings")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
        .unique(),
      ctx.db
        .query("productionLineRecords")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
        .order("desc")
        .take(250),
    ]);
    const selectedRecordIds = new Set(summaries.map((summary) => summary.recordId));
    const scopedReadings = args.status
      ? readings.filter((reading) => selectedRecordIds.has(reading.recordId))
      : readings;
    const scopedCycles =
      args.status || args.specificationVersion !== undefined
        ? cycles.filter((cycle) => selectedRecordIds.has(cycle.recordId))
        : cycles;
    return {
      overview: buildOverviewReport(summaries, settings?.timezone ?? "UTC", sourceRows, args),
      readiness: buildReadinessReport(summaries, args),
      comparison: buildComparisonReport(summaries, scopedReadings, scopedCycles, args.groupBy),
      workflow: buildWorkflowReport(summaries, scopedCycles, args),
    };
  },
});

const auditRowValidator = v.object({
  recordId: v.id("productionLineRecords"),
  displaySerial: v.string(),
  printedBatchCode: v.optional(v.string()),
  productName: v.string(),
  productionHallCode: productionHallCodeValidator,
  departmentName: v.string(),
  qcUserName: v.string(),
  inspectionAt: v.number(),
  specificationVersion: v.number(),
  status: productionLineRecordStatusValidator,
  hasBatchLabelPhoto: v.boolean(),
  hasConfirmedBatchCode: v.boolean(),
  readingsComplete: v.boolean(),
  checksComplete: v.boolean(),
  outOfLimitReadingCount: v.number(),
});

export const listAuditRecords = query({
  args: reportFilterValidator.extend({
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  }).fields,
  returns: paginationResultValidator(auditRowValidator),
  handler: async (ctx, args) => {
    await authorize(ctx, args.organizationId);
    validateRange(args);
    const result = await ctx.db
      .query("qualityInspectionSummaries")
      .withIndex("by_organizationId_and_inspectionAt", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .gte("inspectionAt", args.from)
          .lt("inspectionAt", args.to),
      )
      .order("desc")
      .paginate(args.paginationOpts);
    const search = args.search?.trim().toLocaleLowerCase();
    return {
      ...result,
      page: result.page
        .filter((row) => matchesFilters(row, args))
        .filter(
          (row) =>
            !search ||
            [row.displaySerial, row.printedBatchCode, row.productName, row.qcUserName]
              .filter(Boolean)
              .some((value) => value?.toLocaleLowerCase().includes(search)),
        )
        .map((row) => ({
          recordId: row.recordId,
          displaySerial: row.displaySerial,
          printedBatchCode: row.printedBatchCode,
          productName: row.productName,
          productionHallCode: row.productionHallCode,
          departmentName: row.departmentName,
          qcUserName: row.qcUserName,
          inspectionAt: row.inspectionAt,
          specificationVersion: row.specificationVersion,
          status: row.status,
          hasBatchLabelPhoto: row.hasBatchLabelPhoto,
          hasConfirmedBatchCode: row.hasConfirmedBatchCode,
          readingsComplete:
            row.completedReadingRequirementCount >= row.requiredReadingRequirementCount,
          checksComplete: row.completedCheckCount >= row.requiredCheckCount,
          outOfLimitReadingCount: row.outOfLimitReadingCount,
        })),
    };
  },
});

export const getAuditRecord = query({
  args: { recordId: v.id("productionLineRecords") },
  returns: v.union(
    v.object({
      recordId: v.id("productionLineRecords"),
      displaySerial: v.string(),
      printedBatchCode: v.optional(v.string()),
      productName: v.string(),
      productionHallCode: productionHallCodeValidator,
      departmentName: v.string(),
      qcUserName: v.string(),
      inspectionAt: v.number(),
      specificationId: v.id("productionLineSpecifications"),
      specificationVersion: v.number(),
      status: productionLineRecordStatusValidator,
      batchLabelPhotoUrl: v.optional(v.string()),
      readings: v.array(
        v.object({
          readingKey: productionLineReadingKeyValidator,
          readingIndex: v.number(),
          value: v.number(),
          unit: productionLineMeasurementUnitValidator,
          minimum: v.number(),
          maximum: v.number(),
          target: v.optional(v.number()),
          withinLimit: v.boolean(),
        }),
      ),
      checks: v.array(
        v.object({ checkKey: productionLineCheckKeyValidator, checked: v.boolean() }),
      ),
      events: v.array(
        v.object({
          action: v.string(),
          actorName: v.string(),
          recordRevision: v.number(),
          metadata: v.optional(v.record(v.string(), v.string())),
          createdAt: v.number(),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record) return null;
    await authorize(ctx, record.organizationId);
    const [readings, checks, events, photoUrl] = await Promise.all([
      ctx.db
        .query("productionLineReadings")
        .withIndex("by_recordId", (q) => q.eq("recordId", record._id))
        .take(500),
      ctx.db
        .query("productionLineChecks")
        .withIndex("by_recordId", (q) => q.eq("recordId", record._id))
        .take(100),
      ctx.db
        .query("productionLineRecordEvents")
        .withIndex("by_recordId", (q) => q.eq("recordId", record._id))
        .take(500),
      record.batchLabelPhotoStorageId ? ctx.storage.getUrl(record.batchLabelPhotoStorageId) : null,
    ]);
    return {
      recordId: record._id,
      displaySerial: record.displaySerial,
      printedBatchCode: record.printedBatchCode,
      productName: record.productName,
      productionHallCode: record.productionHallCode,
      departmentName: record.departmentName,
      qcUserName: record.qcUserName,
      inspectionAt: record.inspectionAt,
      specificationId: record.specificationId,
      specificationVersion: record.specificationVersion,
      status: record.status,
      batchLabelPhotoUrl: photoUrl ?? undefined,
      readings: readings.map((reading) => ({
        readingKey: reading.readingKey,
        readingIndex: reading.readingIndex,
        value: reading.value,
        unit: reading.unit,
        minimum: reading.minimum,
        maximum: reading.maximum,
        target: reading.target,
        withinLimit: reading.withinLimit,
      })),
      checks: checks.map((check) => ({ checkKey: check.checkKey, checked: check.checked })),
      events: [...events]
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((event) => ({
          action: event.action,
          actorName: event.actorName,
          recordRevision: event.recordRevision,
          metadata: event.metadata,
          createdAt: event.createdAt,
        })),
    };
  },
});

export const getLaboratoryQuality = query({
  args: reportFilterValidator.fields,
  returns: v.object({
    totals: v.object({
      reports: v.number(),
      approved: v.number(),
      pending: v.number(),
      failed: v.number(),
      reportsWithOutOfSpec: v.number(),
      testConformanceRate: v.number(),
      sampledFinalProducts: v.number(),
      linkedSamples: v.number(),
      unreportedSamples: v.number(),
      sampleCoverageRate: v.number(),
      medianSampleToReportMs: nullableNumberValidator,
      medianSampleToApprovalMs: nullableNumberValidator,
      medianReportToApprovalMs: nullableNumberValidator,
    }),
    parameters: v.array(
      v.object({
        name: v.string(),
        tests: v.number(),
        outOfSpec: v.number(),
      }),
    ),
    pendingReports: v.array(
      v.object({
        labReportId: v.id("labReports"),
        reportId: v.string(),
        sampleNumber: v.optional(v.string()),
        productName: v.string(),
        lotNumber: v.string(),
        leadChemist: v.string(),
        reportCreatedAt: v.number(),
        ageMs: v.number(),
      }),
    ),
    unreportedSamples: v.array(
      v.object({
        sampleId: v.id("labSampleSubmissions"),
        sampleNumber: v.string(),
        productName: v.string(),
        productionNumber: v.string(),
        sampleLocation: v.string(),
        sampledAt: v.number(),
        ageMs: v.number(),
        submittedByName: v.string(),
      }),
    ),
    recentReports: v.array(
      v.object({
        labReportId: v.id("labReports"),
        reportId: v.string(),
        sampleNumber: v.optional(v.string()),
        productName: v.string(),
        lotNumber: v.string(),
        status: v.string(),
        outOfSpecTestCount: v.number(),
        reportCreatedAt: v.number(),
        signedAt: v.optional(v.number()),
      }),
    ),
    unresolvedLegacyLinks: v.number(),
  }),
  handler: async (ctx, args) => {
    await authorize(ctx, args.organizationId);
    validateRange(args);
    const [reports, testFacts, samples, cohortLinks, issues] = await Promise.all([
      ctx.db
        .query("qualityLabReportSummaries")
        .withIndex("by_organizationId_and_reportCreatedAt", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .gte("reportCreatedAt", args.from)
            .lt("reportCreatedAt", args.to),
        )
        .take(MAXIMUM_REPORT_ROWS),
      ctx.db
        .query("qualityLabTestFacts")
        .withIndex("by_organizationId_and_reportCreatedAt", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .gte("reportCreatedAt", args.from)
            .lt("reportCreatedAt", args.to),
        )
        .take(MAXIMUM_REPORT_ROWS),
      ctx.db
        .query("labSampleSubmissions")
        .withIndex("by_organizationId_and_sampledAt", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .gte("sampledAt", args.from)
            .lt("sampledAt", args.to),
        )
        .take(MAXIMUM_REPORT_ROWS),
      ctx.db
        .query("qualityLabReportSummaries")
        .withIndex("by_organizationId_and_sampledAt", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .gte("sampledAt", args.from)
            .lt("sampledAt", args.to),
        )
        .take(MAXIMUM_REPORT_ROWS),
      ctx.db
        .query("qualityReportingMigrationIssues")
        .withIndex("by_organizationId_and_reason", (q) =>
          q.eq("organizationId", args.organizationId),
        )
        .take(1000),
    ]);
    const filteredReports = reports.filter(
      (report) => !args.productId || report.projectId === args.productId,
    );
    const filteredSamples = samples.filter(
      (sample) =>
        sample.sampleType === "final_product" &&
        (!args.productId || sample.projectId === args.productId),
    );
    const filteredTestFacts = testFacts.filter(
      (fact) => !args.productId || fact.projectId === args.productId,
    );
    const filteredCohortLinks = cohortLinks.filter(
      (report) => !args.productId || report.projectId === args.productId,
    );
    const linkedSampleIds = new Set(
      filteredCohortLinks.flatMap((report) =>
        report.sampleSubmissionId ? [report.sampleSubmissionId] : [],
      ),
    );
    const totalTests = filteredReports.reduce((total, report) => total + report.totalTestCount, 0);
    const inSpecTests = filteredReports.reduce(
      (total, report) => total + report.inSpecTestCount,
      0,
    );
    const parameterMap = new Map<string, { tests: number; outOfSpec: number }>();
    for (const fact of filteredTestFacts) {
      const aggregate = parameterMap.get(fact.parameter) ?? { tests: 0, outOfSpec: 0 };
      aggregate.tests += 1;
      if (!fact.inSpec) aggregate.outOfSpec += 1;
      parameterMap.set(fact.parameter, aggregate);
    }
    const sampleToReport = filteredCohortLinks.flatMap((report) =>
      report.sampledAt === undefined
        ? []
        : [Math.max(0, report.reportCreatedAt - report.sampledAt)],
    );
    const sampleToApproval = filteredCohortLinks.flatMap((report) =>
      report.sampledAt === undefined || report.signedAt === undefined
        ? []
        : [Math.max(0, report.signedAt - report.sampledAt)],
    );
    const reportToApproval = filteredReports.flatMap((report) =>
      report.signedAt === undefined ? [] : [Math.max(0, report.signedAt - report.reportCreatedAt)],
    );
    return {
      totals: {
        reports: filteredReports.length,
        approved: filteredReports.filter((report) => report.reportStatus === "Approved").length,
        pending: filteredReports.filter((report) => report.reportStatus === "Pending").length,
        failed: filteredReports.filter((report) => report.reportStatus === "Failed").length,
        reportsWithOutOfSpec: filteredReports.filter((report) => report.outOfSpecTestCount > 0)
          .length,
        testConformanceRate: ratio(inSpecTests, totalTests),
        sampledFinalProducts: filteredSamples.length,
        linkedSamples: filteredSamples.filter((sample) => linkedSampleIds.has(sample._id)).length,
        unreportedSamples: filteredSamples.filter((sample) => !linkedSampleIds.has(sample._id))
          .length,
        sampleCoverageRate: ratio(
          filteredSamples.filter((sample) => linkedSampleIds.has(sample._id)).length,
          filteredSamples.length,
        ),
        medianSampleToReportMs: median(sampleToReport),
        medianSampleToApprovalMs: median(sampleToApproval),
        medianReportToApprovalMs: median(reportToApproval),
      },
      parameters: [...parameterMap.entries()]
        .map(([name, aggregate]) => ({ name, ...aggregate }))
        .sort((a, b) => b.outOfSpec - a.outOfSpec),
      pendingReports: filteredReports
        .filter((report) => report.reportStatus === "Pending")
        .sort((a, b) => a.reportCreatedAt - b.reportCreatedAt)
        .slice(0, 100)
        .map((report) => ({
          labReportId: report.labReportId,
          reportId: report.reportId,
          sampleNumber: report.sampleNumber,
          productName: report.productName,
          lotNumber: report.lotNumber,
          leadChemist: report.leadChemist,
          reportCreatedAt: report.reportCreatedAt,
          ageMs: Math.max(0, args.now - report.reportCreatedAt),
        })),
      unreportedSamples: filteredSamples
        .filter((sample) => !linkedSampleIds.has(sample._id))
        .sort((a, b) => a.sampledAt - b.sampledAt)
        .slice(0, 100)
        .map((sample) => ({
          sampleId: sample._id,
          sampleNumber: sample.sampleNumber,
          productName: sample.productName,
          productionNumber: sample.productionNumber,
          sampleLocation: sample.sampleLocation,
          sampledAt: sample.sampledAt,
          ageMs: Math.max(0, args.now - sample.sampledAt),
          submittedByName: sample.submittedByName,
        })),
      recentReports: filteredReports
        .sort((a, b) => b.reportCreatedAt - a.reportCreatedAt)
        .slice(0, 100)
        .map((report) => ({
          labReportId: report.labReportId,
          reportId: report.reportId,
          sampleNumber: report.sampleNumber,
          productName: report.productName,
          lotNumber: report.lotNumber,
          status: report.reportStatus,
          outOfSpecTestCount: report.outOfSpecTestCount,
          reportCreatedAt: report.reportCreatedAt,
          signedAt: report.signedAt,
        })),
      unresolvedLegacyLinks: issues.length,
    };
  },
});
