import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requirePermission } from "./permissions";
import {
  buildDisplaySerial,
  buildInspectionHourKey,
  getProductionLineSubmissionReadiness,
  PRODUCTION_LINE_CHECK_KEYS,
  parsePrintedBatchCode,
} from "./productionLineRecordHelpers";
import {
  closeReviewCycle,
  openReviewCycle,
  syncInspectionSummary,
  syncReadingFact,
} from "./qualityReportingFacts";
import {
  productionHallCodeValidator,
  productionLineCheckKeyValidator,
  productionLineMeasurementUnitValidator,
  productionLineReadingKeyValidator,
  productionLineRecordStatusValidator,
} from "./validators";
import { requireWorkspaceMember } from "./workspaceAccess";

const editableStatuses = new Set(["draft", "returned"]);
const allowedBatchLabelMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumBatchLabelBytes = 8 * 1024 * 1024;

const recordSummaryValidator = v.object({
  _id: v.id("productionLineRecords"),
  displaySerial: v.string(),
  inspectionAt: v.number(),
  printedBatchCode: v.optional(v.string()),
  productName: v.string(),
  productionHallCode: productionHallCodeValidator,
  status: v.string(),
  updatedAt: v.number(),
});

const reviewSummaryValidator = v.object({
  _id: v.id("productionLineRecords"),
  departmentName: v.string(),
  displaySerial: v.string(),
  inspectionAt: v.number(),
  printedBatchCode: v.optional(v.string()),
  productName: v.string(),
  productionHallCode: productionHallCodeValidator,
  qcUserName: v.string(),
  status: v.string(),
  updatedAt: v.number(),
});

const specificationLimitReturnValidator = v.object({
  readingKey: productionLineReadingKeyValidator,
  unit: productionLineMeasurementUnitValidator,
  minimum: v.number(),
  maximum: v.number(),
  target: v.optional(v.number()),
  minimumReadingCount: v.number(),
});

const readingReturnValidator = v.object({
  readingKey: productionLineReadingKeyValidator,
  readingIndex: v.number(),
  value: v.number(),
  unit: productionLineMeasurementUnitValidator,
  minimum: v.number(),
  maximum: v.number(),
  target: v.optional(v.number()),
  withinLimit: v.boolean(),
});

const checkReturnValidator = v.object({
  checkKey: productionLineCheckKeyValidator,
  checked: v.boolean(),
});

const recordDetailValidator = v.object({
  _id: v.id("productionLineRecords"),
  batchLabelCapturedAt: v.optional(v.number()),
  batchLabelConfirmedAt: v.optional(v.number()),
  batchLabelMimeType: v.optional(v.string()),
  batchLabelPhotoUrl: v.optional(v.string()),
  batchLabelSize: v.optional(v.number()),
  createdAt: v.number(),
  dailyBatchSequence: v.optional(v.number()),
  departmentName: v.string(),
  displaySerial: v.string(),
  inspectionAt: v.number(),
  inspectionHourKey: v.string(),
  labelProductionDate: v.optional(v.string()),
  printedBatchCode: v.optional(v.string()),
  productId: v.id("projects"),
  productName: v.string(),
  productionHallCode: productionHallCodeValidator,
  qcUserName: v.string(),
  readings: v.array(readingReturnValidator),
  recordRevision: v.number(),
  checks: v.array(checkReturnValidator),
  specificationLimits: v.array(specificationLimitReturnValidator),
  specificationVersion: v.number(),
  status: v.string(),
  organizationId: v.id("organizations"),
  updatedAt: v.number(),
});

const referenceDataValidator = v.object({
  enabledHallCodes: v.array(productionHallCodeValidator),
  products: v.array(
    v.object({
      productId: v.id("projects"),
      productName: v.string(),
      productPhotoUrl: v.optional(v.string()),
      specificationId: v.id("productionLineSpecifications"),
      specificationVersion: v.number(),
    }),
  ),
  timezone: v.string(),
});

async function requireEditableRecord(
  ctx: MutationCtx,
  recordId: Doc<"productionLineRecords">["_id"],
) {
  const record = await ctx.db.get(recordId);
  if (!record) {
    throw new Error("Production-line record not found");
  }
  const { authUser } = await requireWorkspaceMember(ctx, record.organizationId);
  await requirePermission(ctx, record.organizationId, "record_production_checks");
  if (!editableStatuses.has(record.status)) {
    throw new Error("This production-line record is no longer editable");
  }
  if (record.editableOwnerUserId !== authUser._id) {
    throw new Error("This production-line record is assigned to another user");
  }
  return { authUser, record };
}

async function addRecordEvent(
  ctx: MutationCtx,
  record: Doc<"productionLineRecords">,
  actor: { _id: string; name?: string | null; email?: string | null },
  action: string,
  recordRevision: number,
  metadata?: Record<string, string>,
) {
  await ctx.db.insert("productionLineRecordEvents", {
    recordId: record._id,
    organizationId: record.organizationId,
    action,
    actorId: actor._id,
    actorName: actor.name ?? actor.email ?? "Unknown",
    recordRevision,
    metadata,
    createdAt: Date.now(),
  });
}

async function buildRecordDetail(ctx: QueryCtx, record: Doc<"productionLineRecords">) {
  const [specificationLimits, readings, checks] = await Promise.all([
    ctx.db
      .query("productionLineSpecificationLimits")
      .withIndex("by_specificationId_and_readingKey", (q) =>
        q.eq("specificationId", record.specificationId),
      )
      .take(5),
    ctx.db
      .query("productionLineReadings")
      .withIndex("by_recordId", (q) => q.eq("recordId", record._id))
      .take(500),
    ctx.db
      .query("productionLineChecks")
      .withIndex("by_recordId", (q) => q.eq("recordId", record._id))
      .take(22),
  ]);
  const batchLabelPhotoUrl = record.batchLabelPhotoStorageId
    ? await ctx.storage.getUrl(record.batchLabelPhotoStorageId)
    : null;
  return {
    _id: record._id,
    organizationId: record.organizationId,
    productionHallCode: record.productionHallCode,
    displaySerial: record.displaySerial,
    departmentName: record.departmentName,
    productId: record.productId,
    productName: record.productName,
    inspectionAt: record.inspectionAt,
    inspectionHourKey: record.inspectionHourKey,
    specificationVersion: record.specificationVersion,
    specificationLimits: specificationLimits.map((limit) => ({
      readingKey: limit.readingKey,
      unit: limit.unit,
      minimum: limit.minimum,
      maximum: limit.maximum,
      target: limit.target,
      minimumReadingCount: limit.minimumReadingCount,
    })),
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
    checks: checks.map((check) => ({
      checkKey: check.checkKey,
      checked: check.checked,
    })),
    batchLabelPhotoUrl: batchLabelPhotoUrl ?? undefined,
    batchLabelMimeType: record.batchLabelMimeType,
    batchLabelSize: record.batchLabelSize,
    batchLabelCapturedAt: record.batchLabelCapturedAt,
    printedBatchCode: record.printedBatchCode,
    labelProductionDate: record.labelProductionDate,
    dailyBatchSequence: record.dailyBatchSequence,
    batchLabelConfirmedAt: record.batchLabelConfirmedAt,
    status: record.status,
    qcUserName: record.qcUserName,
    recordRevision: record.recordRevision,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export const getMobileReferenceData = query({
  args: { organizationId: v.id("organizations") },
  returns: v.union(referenceDataValidator, v.null()),
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.organizationId);
    await requirePermission(ctx, args.organizationId, "record_production_checks");
    const settings = await ctx.db
      .query("productionLineSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .unique();
    if (!settings) {
      return null;
    }
    const specifications = await ctx.db
      .query("productionLineSpecifications")
      .withIndex("by_organizationId_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active"),
      )
      .take(200);
    const products = await Promise.all(
      specifications.map(async (specification) => {
        const project = await ctx.db.get(specification.productId);
        const productPhotoUrl = project?.photoStorageId
          ? await ctx.storage.getUrl(project.photoStorageId)
          : null;

        return {
          productId: specification.productId,
          productName: specification.productName,
          productPhotoUrl: productPhotoUrl ?? undefined,
          specificationId: specification._id,
          specificationVersion: specification.version,
        };
      }),
    );

    return {
      timezone: settings.timezone,
      enabledHallCodes: settings.enabledHallCodes,
      products,
    };
  },
});

export const listMine = query({
  args: { organizationId: v.id("organizations") },
  returns: v.array(recordSummaryValidator),
  handler: async (ctx, args) => {
    const { authUser } = await requireWorkspaceMember(ctx, args.organizationId);
    await requirePermission(ctx, args.organizationId, "record_production_checks");
    const records = await ctx.db
      .query("productionLineRecords")
      .withIndex("by_organizationId_and_qcUserId", (q) =>
        q.eq("organizationId", args.organizationId).eq("qcUserId", authUser._id),
      )
      .order("desc")
      .take(50);
    return records.map((record) => ({
      _id: record._id,
      displaySerial: record.displaySerial,
      inspectionAt: record.inspectionAt,
      printedBatchCode: record.printedBatchCode,
      productName: record.productName,
      productionHallCode: record.productionHallCode,
      status: record.status,
      updatedAt: record.updatedAt,
    }));
  },
});

export const get = query({
  args: { recordId: v.id("productionLineRecords") },
  returns: v.union(recordDetailValidator, v.null()),
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record) {
      return null;
    }
    await requireWorkspaceMember(ctx, record.organizationId);
    await requirePermission(ctx, record.organizationId, "view_production_checks");
    return await buildRecordDetail(ctx, record);
  },
});

export const listForReview = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(productionLineRecordStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(reviewSummaryValidator),
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.organizationId);
    await requirePermission(ctx, args.organizationId, "view_production_checks");
    const selectedStatus = args.status;
    const result = selectedStatus
      ? await ctx.db
          .query("productionLineRecords")
          .withIndex("by_organizationId_and_status", (q) =>
            q.eq("organizationId", args.organizationId).eq("status", selectedStatus),
          )
          .order("asc")
          .paginate(args.paginationOpts)
      : await ctx.db
          .query("productionLineRecords")
          .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
          .order("desc")
          .paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.map((record) => ({
        _id: record._id,
        departmentName: record.departmentName,
        displaySerial: record.displaySerial,
        inspectionAt: record.inspectionAt,
        printedBatchCode: record.printedBatchCode,
        productName: record.productName,
        productionHallCode: record.productionHallCode,
        qcUserName: record.qcUserName,
        status: record.status,
        updatedAt: record.updatedAt,
      })),
    };
  },
});

export const createDraft = mutation({
  args: {
    organizationId: v.id("organizations"),
    productionHallCode: productionHallCodeValidator,
    departmentName: v.string(),
    productId: v.id("projects"),
    inspectionAt: v.number(),
  },
  returns: v.id("productionLineRecords"),
  handler: async (ctx, args) => {
    const { authUser } = await requireWorkspaceMember(ctx, args.organizationId);
    await requirePermission(ctx, args.organizationId, "record_production_checks");
    const departmentName = args.departmentName.trim();
    if (!departmentName) {
      throw new Error("Production line or department is required");
    }
    if (!Number.isFinite(args.inspectionAt)) {
      throw new Error("Inspection time is invalid");
    }

    const settings = await ctx.db
      .query("productionLineSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .unique();
    if (!settings?.enabledHallCodes.includes(args.productionHallCode)) {
      throw new Error("Selected production hall is not enabled");
    }
    const inspectionHourKey = buildInspectionHourKey(args.inspectionAt, settings.timezone);
    const product = await ctx.db.get(args.productId);
    if (!product || product.organizationId !== args.organizationId) {
      throw new Error("Product does not belong to this workspace");
    }
    const specification = await ctx.db
      .query("productionLineSpecifications")
      .withIndex("by_organizationId_and_productId_and_status", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("productId", args.productId)
          .eq("status", "active"),
      )
      .unique();
    if (!specification) {
      throw new Error("Product has no active production-line specification");
    }

    const existing = await ctx.db
      .query("productionLineRecords")
      .withIndex("by_organizationId_departmentName_productId_inspectionHourKey", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("departmentName", departmentName)
          .eq("productId", args.productId)
          .eq("inspectionHourKey", inspectionHourKey),
      )
      .unique();
    if (existing) {
      return existing._id;
    }

    const counter = await ctx.db
      .query("productionLineSerialCounters")
      .withIndex("by_organizationId_and_hallCode", (q) =>
        q.eq("organizationId", args.organizationId).eq("hallCode", args.productionHallCode),
      )
      .unique();
    if (!counter) {
      throw new Error("Selected production hall serial counter is not initialized");
    }
    const displaySerial = buildDisplaySerial(args.productionHallCode, counter.nextSequence);
    const now = Date.now();
    const recordId = await ctx.db.insert("productionLineRecords", {
      organizationId: args.organizationId,
      productionHallCode: args.productionHallCode,
      serialSequence: counter.nextSequence,
      displaySerial,
      departmentName,
      productId: args.productId,
      productName: product.name,
      inspectionAt: args.inspectionAt,
      inspectionHourKey,
      specificationId: specification._id,
      specificationVersion: specification.version,
      status: "draft",
      editableOwnerUserId: authUser._id,
      qcUserId: authUser._id,
      qcUserName: authUser.name ?? authUser.email ?? "Unknown",
      recordRevision: 1,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(counter._id, {
      nextSequence: counter.nextSequence + 1,
      lastAllocatedAt: now,
      lastAllocatedBy: authUser._id,
    });
    const record = await ctx.db.get(recordId);
    if (!record) {
      throw new Error("Could not create production-line record");
    }
    await addRecordEvent(ctx, record, authUser, "record.created", 1, {
      displaySerial,
      inspectionHourKey,
    });
    await syncInspectionSummary(ctx, recordId);
    return recordId;
  },
});

export const generatePhotoUploadUrl = mutation({
  args: { recordId: v.id("productionLineRecords") },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireEditableRecord(ctx, args.recordId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachBatchLabelPhoto = mutation({
  args: {
    recordId: v.id("productionLineRecords"),
    storageId: v.id("_storage"),
    capturedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { authUser, record } = await requireEditableRecord(ctx, args.recordId);
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (!metadata) {
      throw new Error("Uploaded batch-label photo was not found");
    }
    if (!metadata.contentType || !allowedBatchLabelMimeTypes.has(metadata.contentType)) {
      throw new Error("Batch-label evidence must be a JPEG, PNG, or WebP image");
    }
    if (metadata.size > maximumBatchLabelBytes) {
      throw new Error("Batch-label image must be 8 MB or smaller");
    }
    const nextRevision = record.recordRevision + 1;
    const now = Date.now();
    await ctx.db.patch(record._id, {
      batchLabelPhotoStorageId: args.storageId,
      batchLabelMimeType: metadata.contentType,
      batchLabelSize: metadata.size,
      batchLabelCapturedAt: args.capturedAt,
      batchLabelConfirmedBy: undefined,
      batchLabelConfirmedAt: undefined,
      recordRevision: nextRevision,
      updatedAt: now,
    });
    await addRecordEvent(
      ctx,
      record,
      authUser,
      record.batchLabelPhotoStorageId ? "batch_label.photo_replaced" : "batch_label.photo_attached",
      nextRevision,
    );
    await syncInspectionSummary(ctx, record._id);
    if (record.batchLabelPhotoStorageId && record.batchLabelPhotoStorageId !== args.storageId) {
      await ctx.storage.delete(record.batchLabelPhotoStorageId);
    }
    return null;
  },
});

export const updateBatchLabelCode = mutation({
  args: {
    recordId: v.id("productionLineRecords"),
    printedBatchCode: v.string(),
    confirmed: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { authUser, record } = await requireEditableRecord(ctx, args.recordId);
    if (!record.batchLabelPhotoStorageId) {
      throw new Error("Capture the carton label before confirming its code");
    }
    if (!args.confirmed) {
      throw new Error("Confirm that the typed code matches the captured label");
    }
    const parsed = parsePrintedBatchCode(args.printedBatchCode);
    const nextRevision = record.recordRevision + 1;
    const now = Date.now();
    await ctx.db.patch(record._id, {
      printedBatchCode: parsed.normalizedCode,
      labelProductionDate: parsed.labelProductionDate,
      dailyBatchSequence: parsed.dailyBatchSequence,
      batchLabelConfirmedBy: authUser._id,
      batchLabelConfirmedAt: now,
      recordRevision: nextRevision,
      updatedAt: now,
    });
    await addRecordEvent(ctx, record, authUser, "batch_label.code_confirmed", nextRevision, {
      normalizedCode: parsed.normalizedCode,
      labelProductionDate: parsed.labelProductionDate,
      dailyBatchSequence: String(parsed.dailyBatchSequence),
    });
    await syncInspectionSummary(ctx, record._id);
    return null;
  },
});

export const saveReading = mutation({
  args: {
    recordId: v.id("productionLineRecords"),
    readingKey: productionLineReadingKeyValidator,
    readingIndex: v.number(),
    value: v.union(v.number(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { authUser, record } = await requireEditableRecord(ctx, args.recordId);
    if (
      !Number.isSafeInteger(args.readingIndex) ||
      args.readingIndex < 1 ||
      args.readingIndex > 100
    ) {
      throw new Error("Reading index must be an integer between 1 and 100");
    }
    if (args.value !== null && !Number.isFinite(args.value)) {
      throw new Error("Reading value must be a finite number");
    }

    const existing = await ctx.db
      .query("productionLineReadings")
      .withIndex("by_recordId_and_readingKey_and_readingIndex", (q) =>
        q
          .eq("recordId", record._id)
          .eq("readingKey", args.readingKey)
          .eq("readingIndex", args.readingIndex),
      )
      .unique();
    const nextRevision = record.recordRevision + 1;
    const now = Date.now();
    let readingId = existing?._id;
    if (args.value === null) {
      if (!existing) {
        return null;
      }
      await ctx.db.delete(existing._id);
    } else {
      const limit = await ctx.db
        .query("productionLineSpecificationLimits")
        .withIndex("by_specificationId_and_readingKey", (q) =>
          q.eq("specificationId", record.specificationId).eq("readingKey", args.readingKey),
        )
        .unique();
      if (!limit) {
        throw new Error("The record specification does not contain this measurement");
      }
      const reading = {
        value: args.value,
        unit: limit.unit,
        minimum: limit.minimum,
        maximum: limit.maximum,
        target: limit.target,
        withinLimit: args.value >= limit.minimum && args.value <= limit.maximum,
        observedAt: now,
        observedBy: authUser._id,
        updatedAt: now,
      };
      if (existing) {
        await ctx.db.patch(existing._id, reading);
      } else {
        readingId = await ctx.db.insert("productionLineReadings", {
          recordId: record._id,
          readingKey: args.readingKey,
          readingIndex: args.readingIndex,
          ...reading,
        });
      }
    }

    await ctx.db.patch(record._id, { recordRevision: nextRevision, updatedAt: now });
    await addRecordEvent(
      ctx,
      record,
      authUser,
      args.value === null ? "reading.removed" : existing ? "reading.updated" : "reading.created",
      nextRevision,
      {
        readingKey: args.readingKey,
        readingIndex: String(args.readingIndex),
        ...(args.value === null ? {} : { value: String(args.value) }),
      },
    );
    if (readingId) {
      await syncReadingFact(ctx, readingId);
    }
    await syncInspectionSummary(ctx, record._id);
    return null;
  },
});

export const updateComplianceCheck = mutation({
  args: {
    recordId: v.id("productionLineRecords"),
    checkKey: productionLineCheckKeyValidator,
    checked: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { authUser, record } = await requireEditableRecord(ctx, args.recordId);
    const existing = await ctx.db
      .query("productionLineChecks")
      .withIndex("by_recordId_and_checkKey", (q) =>
        q.eq("recordId", record._id).eq("checkKey", args.checkKey),
      )
      .unique();
    if (existing?.checked === args.checked) {
      return null;
    }

    const now = Date.now();
    const check = { checked: args.checked, updatedAt: now, updatedBy: authUser._id };
    if (existing) {
      await ctx.db.patch(existing._id, check);
    } else {
      await ctx.db.insert("productionLineChecks", {
        recordId: record._id,
        checkKey: args.checkKey,
        ...check,
      });
    }

    const nextRevision = record.recordRevision + 1;
    await ctx.db.patch(record._id, { recordRevision: nextRevision, updatedAt: now });
    await addRecordEvent(ctx, record, authUser, "compliance_check.updated", nextRevision, {
      checkKey: args.checkKey,
      checked: String(args.checked),
    });
    await syncInspectionSummary(ctx, record._id);
    return null;
  },
});

export const submitForReview = mutation({
  args: { recordId: v.id("productionLineRecords") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { authUser, record } = await requireEditableRecord(ctx, args.recordId);
    const [limits, readings, checks] = await Promise.all([
      ctx.db
        .query("productionLineSpecificationLimits")
        .withIndex("by_specificationId_and_readingKey", (q) =>
          q.eq("specificationId", record.specificationId),
        )
        .take(5),
      ctx.db
        .query("productionLineReadings")
        .withIndex("by_recordId", (q) => q.eq("recordId", record._id))
        .take(500),
      ctx.db
        .query("productionLineChecks")
        .withIndex("by_recordId", (q) => q.eq("recordId", record._id))
        .take(PRODUCTION_LINE_CHECK_KEYS.length),
    ]);
    const readiness = getProductionLineSubmissionReadiness({
      checks,
      hasBatchLabelPhoto: Boolean(record.batchLabelPhotoStorageId),
      hasConfirmedBatchCode: Boolean(record.printedBatchCode && record.batchLabelConfirmedAt),
      limits,
      readings,
    });
    if (!readiness.isReady) {
      throw new Error(
        `Inspection cannot be submitted. Missing: ${readiness.missingRequirements.join(", ")}`,
      );
    }

    const nextRevision = record.recordRevision + 1;
    const now = Date.now();
    await ctx.db.patch(record._id, {
      status: "pending_production_review",
      recordRevision: nextRevision,
      updatedAt: now,
    });
    await openReviewCycle(ctx, record, now);
    await addRecordEvent(ctx, record, authUser, "record.submitted_for_review", nextRevision, {
      previousStatus: record.status,
      status: "pending_production_review",
    });
    await syncInspectionSummary(ctx, record._id);
    return null;
  },
});

export const review = mutation({
  args: {
    recordId: v.id("productionLineRecords"),
    decision: v.union(v.literal("approved"), v.literal("returned")),
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record) {
      throw new Error("Production-line record not found");
    }
    const { authUser } = await requireWorkspaceMember(ctx, record.organizationId);
    await requirePermission(ctx, record.organizationId, "review_production_checks");
    if (record.status !== "pending_production_review") {
      throw new Error("Only pending production-line records can be reviewed");
    }

    const note = args.note?.trim();
    if (args.decision === "returned" && !note) {
      throw new Error("A review note is required when returning a record");
    }
    if (note && note.length > 1000) {
      throw new Error("Review notes must be 1000 characters or fewer");
    }

    const nextRevision = record.recordRevision + 1;
    const now = Date.now();
    await ctx.db.patch(record._id, {
      status: args.decision,
      recordRevision: nextRevision,
      updatedAt: now,
    });
    await closeReviewCycle(ctx, record, authUser, args.decision, now, Boolean(note));
    await addRecordEvent(
      ctx,
      record,
      authUser,
      args.decision === "approved" ? "record.approved" : "record.returned",
      nextRevision,
      {
        previousStatus: record.status,
        status: args.decision,
        ...(note ? { note } : {}),
      },
    );
    await syncInspectionSummary(ctx, record._id);
    return null;
  },
});

export const updateComplianceChecks = mutation({
  args: {
    recordId: v.id("productionLineRecords"),
    checkKeys: v.array(productionLineCheckKeyValidator),
    checked: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { authUser, record } = await requireEditableRecord(ctx, args.recordId);
    const checkKeys = [...new Set(args.checkKeys)];
    if (checkKeys.length === 0 || checkKeys.length > PRODUCTION_LINE_CHECK_KEYS.length) {
      throw new Error(
        `Select between 1 and ${PRODUCTION_LINE_CHECK_KEYS.length} compliance checks`,
      );
    }

    const existingChecks = await ctx.db
      .query("productionLineChecks")
      .withIndex("by_recordId", (q) => q.eq("recordId", record._id))
      .take(PRODUCTION_LINE_CHECK_KEYS.length);
    const existingByKey = new Map(existingChecks.map((check) => [check.checkKey, check]));
    const changedKeys = checkKeys.filter(
      (checkKey) => (existingByKey.get(checkKey)?.checked ?? false) !== args.checked,
    );
    if (changedKeys.length === 0) {
      return null;
    }

    const now = Date.now();
    const check = { checked: args.checked, updatedAt: now, updatedBy: authUser._id };
    for (const checkKey of changedKeys) {
      const existing = existingByKey.get(checkKey);
      if (existing) {
        await ctx.db.patch(existing._id, check);
      } else {
        await ctx.db.insert("productionLineChecks", {
          recordId: record._id,
          checkKey,
          ...check,
        });
      }
    }

    const nextRevision = record.recordRevision + 1;
    await ctx.db.patch(record._id, { recordRevision: nextRevision, updatedAt: now });
    await addRecordEvent(ctx, record, authUser, "compliance_checks.updated", nextRevision, {
      checkKeys: changedKeys.join(","),
      checked: String(args.checked),
      count: String(changedKeys.length),
    });
    await syncInspectionSummary(ctx, record._id);
    return null;
  },
});
