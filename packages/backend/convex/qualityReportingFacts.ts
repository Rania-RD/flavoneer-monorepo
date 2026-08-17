import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { PRODUCTION_LINE_CHECK_KEYS } from "./productionLineRecordHelpers";

const MAXIMUM_RECORD_CHILDREN = 500;

function buildDayKey(timestamp: number, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const year = value("year");
  const month = value("month");
  const day = value("day");
  if (!(year && month && day)) {
    throw new Error("Could not calculate the reporting day");
  }
  return `${year}-${month}-${day}`;
}

export async function syncInspectionSummary(
  ctx: MutationCtx,
  recordId: Id<"productionLineRecords">,
) {
  const record = await ctx.db.get(recordId);
  if (!record) {
    const existing = await ctx.db
      .query("qualityInspectionSummaries")
      .withIndex("by_recordId", (q) => q.eq("recordId", recordId))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  }

  const [settings, limits, readings, checks, events, existing] = await Promise.all([
    ctx.db
      .query("productionLineSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", record.organizationId))
      .unique(),
    ctx.db
      .query("productionLineSpecificationLimits")
      .withIndex("by_specificationId_and_readingKey", (q) =>
        q.eq("specificationId", record.specificationId),
      )
      .take(5),
    ctx.db
      .query("productionLineReadings")
      .withIndex("by_recordId", (q) => q.eq("recordId", recordId))
      .take(MAXIMUM_RECORD_CHILDREN),
    ctx.db
      .query("productionLineChecks")
      .withIndex("by_recordId", (q) => q.eq("recordId", recordId))
      .take(PRODUCTION_LINE_CHECK_KEYS.length),
    ctx.db
      .query("productionLineRecordEvents")
      .withIndex("by_recordId", (q) => q.eq("recordId", recordId))
      .take(MAXIMUM_RECORD_CHILDREN),
    ctx.db
      .query("qualityInspectionSummaries")
      .withIndex("by_recordId", (q) => q.eq("recordId", recordId))
      .unique(),
  ]);

  const orderedEvents = [...events].sort((a, b) => a.createdAt - b.createdAt);
  const submissions = orderedEvents.filter(
    (event) => event.action === "record.submitted_for_review",
  );
  const reviews = orderedEvents.filter(
    (event) => event.action === "record.approved" || event.action === "record.returned",
  );
  const firstReview = reviews[0];
  const completedReadingRequirementCount = limits.reduce((total, limit) => {
    const count = readings.filter(
      (reading) =>
        reading.readingKey === limit.readingKey &&
        reading.readingIndex >= 1 &&
        reading.readingIndex <= limit.minimumReadingCount,
    ).length;
    return total + Math.min(count, limit.minimumReadingCount);
  }, 0);
  const outOfLimitReadingKeys = [
    ...new Set(
      readings.filter((reading) => !reading.withinLimit).map((reading) => reading.readingKey),
    ),
  ];
  const fields = {
    organizationId: record.organizationId,
    recordId,
    inspectionAt: record.inspectionAt,
    dayKey: buildDayKey(record.inspectionAt, settings?.timezone ?? "UTC"),
    productId: record.productId,
    productName: record.productName,
    productionHallCode: record.productionHallCode,
    departmentName: record.departmentName,
    specificationId: record.specificationId,
    specificationVersion: record.specificationVersion,
    qcUserId: record.qcUserId,
    qcUserName: record.qcUserName,
    editableOwnerUserId: record.editableOwnerUserId,
    displaySerial: record.displaySerial,
    printedBatchCode: record.printedBatchCode,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    firstSubmittedAt: submissions[0]?.createdAt,
    lastSubmittedAt: submissions.at(-1)?.createdAt,
    lastReviewedAt: reviews.at(-1)?.createdAt,
    firstReviewDecision:
      firstReview?.action === "record.approved"
        ? ("approved" as const)
        : firstReview?.action === "record.returned"
          ? ("returned" as const)
          : undefined,
    returnedCount: reviews.filter((event) => event.action === "record.returned").length,
    totalReadingCount: readings.length,
    withinLimitReadingCount: readings.filter((reading) => reading.withinLimit).length,
    outOfLimitReadingCount: readings.filter((reading) => !reading.withinLimit).length,
    outOfLimitReadingKeys,
    hasBatchLabelPhoto: Boolean(record.batchLabelPhotoStorageId),
    hasConfirmedBatchCode: Boolean(record.printedBatchCode && record.batchLabelConfirmedAt),
    completedCheckCount: checks.filter((check) => check.checked).length,
    requiredCheckCount: PRODUCTION_LINE_CHECK_KEYS.length,
    completedReadingRequirementCount,
    requiredReadingRequirementCount: limits.reduce(
      (total, limit) => total + limit.minimumReadingCount,
      0,
    ),
  };

  if (existing) {
    await ctx.db.patch(existing._id, fields);
    return existing._id;
  }
  return await ctx.db.insert("qualityInspectionSummaries", fields);
}

export async function syncReadingFact(ctx: MutationCtx, readingId: Id<"productionLineReadings">) {
  const [reading, existing] = await Promise.all([
    ctx.db.get(readingId),
    ctx.db
      .query("qualityReadingFacts")
      .withIndex("by_sourceReadingId", (q) => q.eq("sourceReadingId", readingId))
      .unique(),
  ]);
  if (!reading) {
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  }
  const record = await ctx.db.get(reading.recordId);
  if (!record) {
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  }
  const fields = {
    organizationId: record.organizationId,
    sourceReadingId: reading._id,
    recordId: record._id,
    inspectionAt: record.inspectionAt,
    productId: record.productId,
    productName: record.productName,
    productionHallCode: record.productionHallCode,
    departmentName: record.departmentName,
    specificationVersion: record.specificationVersion,
    qcUserId: record.qcUserId,
    qcUserName: record.qcUserName,
    displaySerial: record.displaySerial,
    printedBatchCode: record.printedBatchCode,
    readingKey: reading.readingKey,
    readingIndex: reading.readingIndex,
    value: reading.value,
    unit: reading.unit,
    minimum: reading.minimum,
    maximum: reading.maximum,
    target: reading.target,
    withinLimit: reading.withinLimit,
  };
  if (existing) {
    await ctx.db.patch(existing._id, fields);
    return existing._id;
  }
  return await ctx.db.insert("qualityReadingFacts", fields);
}

export async function openReviewCycle(
  ctx: MutationCtx,
  record: Doc<"productionLineRecords">,
  submittedAt: number,
) {
  const cycles = await ctx.db
    .query("qualityReviewCycles")
    .withIndex("by_recordId_and_cycleNumber", (q) => q.eq("recordId", record._id))
    .order("desc")
    .take(1);
  const cycleNumber = (cycles[0]?.cycleNumber ?? 0) + 1;
  return await ctx.db.insert("qualityReviewCycles", {
    organizationId: record.organizationId,
    recordId: record._id,
    cycleNumber,
    qcUserId: record.qcUserId,
    qcUserName: record.qcUserName,
    productId: record.productId,
    productName: record.productName,
    productionHallCode: record.productionHallCode,
    departmentName: record.departmentName,
    displaySerial: record.displaySerial,
    submittedAt,
  });
}

export async function closeReviewCycle(
  ctx: MutationCtx,
  record: Doc<"productionLineRecords">,
  reviewer: { _id: string; name?: string | null; email?: string | null },
  decision: "approved" | "returned",
  reviewedAt: number,
  hasNote: boolean,
) {
  const cycles = await ctx.db
    .query("qualityReviewCycles")
    .withIndex("by_recordId_and_cycleNumber", (q) => q.eq("recordId", record._id))
    .order("desc")
    .take(20);
  const cycle = cycles.find((candidate) => candidate.decision === undefined);
  if (!cycle) {
    throw new Error("Production-line review cycle was not found");
  }
  await ctx.db.patch(cycle._id, {
    reviewerId: reviewer._id,
    reviewerName: reviewer.name ?? reviewer.email ?? "Unknown",
    reviewedAt,
    decision,
    durationMs: Math.max(0, reviewedAt - cycle.submittedAt),
    hasNote,
  });
}

export async function syncReviewCyclesFromEvents(
  ctx: MutationCtx,
  record: Doc<"productionLineRecords">,
) {
  const events = await ctx.db
    .query("productionLineRecordEvents")
    .withIndex("by_recordId", (q) => q.eq("recordId", record._id))
    .take(MAXIMUM_RECORD_CHILDREN);
  const ordered = [...events].sort((a, b) => a.createdAt - b.createdAt);
  const submissions = ordered.filter((event) => event.action === "record.submitted_for_review");
  for (let index = 0; index < submissions.length; index += 1) {
    const submission = submissions[index];
    const nextSubmission = submissions[index + 1];
    const review = ordered.find(
      (event) =>
        event.createdAt >= submission.createdAt &&
        (!nextSubmission || event.createdAt < nextSubmission.createdAt) &&
        (event.action === "record.approved" || event.action === "record.returned"),
    );
    const cycleNumber = index + 1;
    const existing = await ctx.db
      .query("qualityReviewCycles")
      .withIndex("by_recordId_and_cycleNumber", (q) =>
        q.eq("recordId", record._id).eq("cycleNumber", cycleNumber),
      )
      .unique();
    const fields = {
      organizationId: record.organizationId,
      recordId: record._id,
      cycleNumber,
      qcUserId: record.qcUserId,
      qcUserName: record.qcUserName,
      productId: record.productId,
      productName: record.productName,
      productionHallCode: record.productionHallCode,
      departmentName: record.departmentName,
      displaySerial: record.displaySerial,
      submittedAt: submission.createdAt,
      reviewerId: review?.actorId,
      reviewerName: review?.actorName,
      reviewedAt: review?.createdAt,
      decision:
        review?.action === "record.approved"
          ? ("approved" as const)
          : review?.action === "record.returned"
            ? ("returned" as const)
            : undefined,
      durationMs: review ? Math.max(0, review.createdAt - submission.createdAt) : undefined,
      hasNote: review ? Boolean(review.metadata?.note) : undefined,
    };
    if (existing) {
      await ctx.db.patch(existing._id, fields);
    } else {
      await ctx.db.insert("qualityReviewCycles", fields);
    }
  }
}

export async function syncLabReportSummary(ctx: MutationCtx, labReportId: Id<"labReports">) {
  const [report, existing] = await Promise.all([
    ctx.db.get(labReportId),
    ctx.db
      .query("qualityLabReportSummaries")
      .withIndex("by_labReportId", (q) => q.eq("labReportId", labReportId))
      .unique(),
  ]);
  if (!report?.organizationId) {
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  }
  const [sample, results] = await Promise.all([
    report.sampleSubmissionId ? ctx.db.get(report.sampleSubmissionId) : null,
    ctx.db
      .query("labTestResults")
      .withIndex("by_labReportId", (q) => q.eq("labReportId", report._id))
      .take(MAXIMUM_RECORD_CHILDREN),
  ]);
  const outOfSpecResults = results.filter(
    (result) => result.actualValue < result.min || result.actualValue > result.max,
  );
  const fields = {
    organizationId: report.organizationId,
    labReportId: report._id,
    sampleSubmissionId: sample?._id,
    sampleNumber: sample?.sampleNumber,
    sampleLocation: sample?.sampleLocation,
    sampledAt: sample?.sampledAt,
    projectId: report.projectId,
    productName: report.projectName ?? sample?.productName ?? "Unknown",
    lotNumber: report.lotNumber,
    reportId: report.reportId,
    reportStatus: report.status,
    leadChemist: report.leadChemist,
    sampleType: report.sampleType,
    reportCreatedAt: report._creationTime,
    signedAt: report.signedAt,
    totalTestCount: results.length,
    inSpecTestCount: results.length - outOfSpecResults.length,
    outOfSpecTestCount: outOfSpecResults.length,
    outOfSpecParameters: [...new Set(outOfSpecResults.map((result) => result.parameter))].slice(
      0,
      100,
    ),
  };
  const existingTestFacts = await ctx.db
    .query("qualityLabTestFacts")
    .withIndex("by_labReportId", (q) => q.eq("labReportId", report._id))
    .take(MAXIMUM_RECORD_CHILDREN);
  const existingBySourceId = new Map(
    existingTestFacts.map((fact) => [fact.sourceTestResultId, fact]),
  );
  const sourceIds = new Set(results.map((result) => result._id));
  for (const result of results) {
    const testFields = {
      organizationId: report.organizationId,
      sourceTestResultId: result._id,
      labReportId: report._id,
      sampleSubmissionId: sample?._id,
      reportCreatedAt: report._creationTime,
      projectId: report.projectId,
      productName: report.projectName ?? sample?.productName ?? "Unknown",
      lotNumber: report.lotNumber,
      parameter: result.parameter,
      actualValue: result.actualValue,
      minimum: result.min,
      maximum: result.max,
      unit: result.unit,
      inSpec: result.actualValue >= result.min && result.actualValue <= result.max,
    };
    const existingTestFact = existingBySourceId.get(result._id);
    if (existingTestFact) {
      await ctx.db.patch(existingTestFact._id, testFields);
    } else {
      await ctx.db.insert("qualityLabTestFacts", testFields);
    }
  }
  for (const fact of existingTestFacts) {
    if (!sourceIds.has(fact.sourceTestResultId)) {
      await ctx.db.delete(fact._id);
    }
  }
  if (existing) {
    await ctx.db.patch(existing._id, fields);
    return existing._id;
  }
  return await ctx.db.insert("qualityLabReportSummaries", fields);
}

export async function removeLabReportSummary(ctx: MutationCtx, labReportId: Id<"labReports">) {
  const existing = await ctx.db
    .query("qualityLabReportSummaries")
    .withIndex("by_labReportId", (q) => q.eq("labReportId", labReportId))
    .unique();
  if (existing) {
    await ctx.db.delete(existing._id);
  }
  const testFacts = await ctx.db
    .query("qualityLabTestFacts")
    .withIndex("by_labReportId", (q) => q.eq("labReportId", labReportId))
    .take(MAXIMUM_RECORD_CHILDREN);
  for (const fact of testFacts) {
    await ctx.db.delete(fact._id);
  }
}
