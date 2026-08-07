import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePermission } from "./permissions";
import { PRODUCTION_LINE_READING_KEYS } from "./productionLineRecordHelpers";
import {
  productionLineMeasurementUnitValidator,
  productionLineReadingKeyValidator,
} from "./validators";
import { requireWorkspaceAdmin, requireWorkspaceMember } from "./workspaceAccess";

const specificationSummaryValidator = v.object({
  _id: v.id("productionLineSpecifications"),
  effectiveAt: v.optional(v.number()),
  productId: v.id("projects"),
  productName: v.string(),
  status: v.string(),
  version: v.number(),
});

const specificationLimitSummaryValidator = v.object({
  maximum: v.number(),
  minimum: v.number(),
  minimumReadingCount: v.number(),
  readingKey: productionLineReadingKeyValidator,
  target: v.optional(v.number()),
  unit: productionLineMeasurementUnitValidator,
});

export const listByProduct = query({
  args: {
    organizationId: v.id("organizations"),
    productId: v.id("projects"),
  },
  returns: v.array(specificationSummaryValidator),
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.organizationId);
    const specifications = await ctx.db
      .query("productionLineSpecifications")
      .withIndex("by_organizationId_and_productId", (q) =>
        q.eq("organizationId", args.organizationId).eq("productId", args.productId),
      )
      .order("desc")
      .take(100);
    return specifications.map((specification) => ({
      _id: specification._id,
      productId: specification.productId,
      productName: specification.productName,
      version: specification.version,
      status: specification.status,
      effectiveAt: specification.effectiveAt,
    }));
  },
});

export const getDraftForProduct = query({
  args: {
    organizationId: v.id("organizations"),
    productId: v.id("projects"),
  },
  returns: v.union(
    v.object({
      _id: v.id("productionLineSpecifications"),
      limits: v.array(specificationLimitSummaryValidator),
      version: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.organizationId);
    const specification = await ctx.db
      .query("productionLineSpecifications")
      .withIndex("by_organizationId_and_productId_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("productId", args.productId).eq("status", "draft"),
      )
      .unique();
    if (!specification) {
      return null;
    }
    const limits = await ctx.db
      .query("productionLineSpecificationLimits")
      .withIndex("by_specificationId_and_readingKey", (q) =>
        q.eq("specificationId", specification._id),
      )
      .take(PRODUCTION_LINE_READING_KEYS.length);
    return {
      _id: specification._id,
      version: specification.version,
      limits: limits.map((limit) => ({
        readingKey: limit.readingKey,
        unit: limit.unit,
        minimum: limit.minimum,
        maximum: limit.maximum,
        target: limit.target,
        minimumReadingCount: limit.minimumReadingCount,
      })),
    };
  },
});

export const createDraft = mutation({
  args: {
    organizationId: v.id("organizations"),
    productId: v.id("projects"),
  },
  returns: v.id("productionLineSpecifications"),
  handler: async (ctx, args) => {
    const { authUser } = await requireWorkspaceAdmin(ctx, args.organizationId);
    await requirePermission(ctx, "manage_production_specifications");
    const product = await ctx.db.get(args.productId);
    if (!product || product.organizationId !== args.organizationId) {
      throw new Error("Product does not belong to this workspace");
    }

    const existingDraft = await ctx.db
      .query("productionLineSpecifications")
      .withIndex("by_organizationId_and_productId_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("productId", args.productId).eq("status", "draft"),
      )
      .unique();
    if (existingDraft) {
      return existingDraft._id;
    }

    const specifications = await ctx.db
      .query("productionLineSpecifications")
      .withIndex("by_organizationId_and_productId", (q) =>
        q.eq("organizationId", args.organizationId).eq("productId", args.productId),
      )
      .take(100);
    const version =
      specifications.reduce(
        (maximum, specification) => Math.max(maximum, specification.version),
        0,
      ) + 1;
    const specificationId = await ctx.db.insert("productionLineSpecifications", {
      organizationId: args.organizationId,
      productId: args.productId,
      productName: product.name,
      version,
      status: "draft",
      createdAt: Date.now(),
      createdBy: authUser._id,
    });

    const active = await ctx.db
      .query("productionLineSpecifications")
      .withIndex("by_organizationId_and_productId_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("productId", args.productId).eq("status", "active"),
      )
      .unique();
    if (active) {
      const limits = await ctx.db
        .query("productionLineSpecificationLimits")
        .withIndex("by_specificationId_and_readingKey", (q) => q.eq("specificationId", active._id))
        .take(PRODUCTION_LINE_READING_KEYS.length);
      for (const limit of limits) {
        await ctx.db.insert("productionLineSpecificationLimits", {
          specificationId,
          readingKey: limit.readingKey,
          unit: limit.unit,
          minimum: limit.minimum,
          maximum: limit.maximum,
          target: limit.target,
          minimumReadingCount: limit.minimumReadingCount,
        });
      }
    }
    return specificationId;
  },
});

export const updateLimit = mutation({
  args: {
    specificationId: v.id("productionLineSpecifications"),
    readingKey: productionLineReadingKeyValidator,
    unit: productionLineMeasurementUnitValidator,
    minimum: v.number(),
    maximum: v.number(),
    target: v.optional(v.number()),
    minimumReadingCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const specification = await ctx.db.get(args.specificationId);
    if (!specification) {
      throw new Error("Production-line specification not found");
    }
    await requireWorkspaceAdmin(ctx, specification.organizationId);
    await requirePermission(ctx, "manage_production_specifications");
    if (specification.status !== "draft") {
      throw new Error("Published specification versions are immutable");
    }
    if (args.maximum < args.minimum) {
      throw new Error("Maximum must be greater than or equal to minimum");
    }
    if (args.target !== undefined && (args.target < args.minimum || args.target > args.maximum)) {
      throw new Error("Target must be inside the acceptable range");
    }
    if (!Number.isSafeInteger(args.minimumReadingCount) || args.minimumReadingCount < 1) {
      throw new Error("Minimum reading count must be a positive integer");
    }
    const isTemperature = args.readingKey === "chocolate_temperature";
    if ((isTemperature && args.unit !== "°C") || (!isTemperature && args.unit === "°C")) {
      throw new Error("Measurement unit does not match the reading type");
    }

    const existing = await ctx.db
      .query("productionLineSpecificationLimits")
      .withIndex("by_specificationId_and_readingKey", (q) =>
        q.eq("specificationId", args.specificationId).eq("readingKey", args.readingKey),
      )
      .unique();
    const value = {
      unit: args.unit,
      minimum: args.minimum,
      maximum: args.maximum,
      target: args.target,
      minimumReadingCount: args.minimumReadingCount,
    };
    if (existing) {
      await ctx.db.patch(existing._id, value);
    } else {
      await ctx.db.insert("productionLineSpecificationLimits", {
        specificationId: args.specificationId,
        readingKey: args.readingKey,
        ...value,
      });
    }
    return null;
  },
});

export const publish = mutation({
  args: { specificationId: v.id("productionLineSpecifications") },
  returns: v.id("productionLineSpecifications"),
  handler: async (ctx, args) => {
    const specification = await ctx.db.get(args.specificationId);
    if (!specification) {
      throw new Error("Production-line specification not found");
    }
    const { authUser } = await requireWorkspaceAdmin(ctx, specification.organizationId);
    await requirePermission(ctx, "manage_production_specifications");
    if (specification.status !== "draft") {
      throw new Error("Only draft specifications can be published");
    }

    const limits = await ctx.db
      .query("productionLineSpecificationLimits")
      .withIndex("by_specificationId_and_readingKey", (q) =>
        q.eq("specificationId", args.specificationId),
      )
      .take(PRODUCTION_LINE_READING_KEYS.length + 1);
    const presentKeys = new Set(limits.map((limit) => limit.readingKey));
    if (
      limits.length !== PRODUCTION_LINE_READING_KEYS.length ||
      PRODUCTION_LINE_READING_KEYS.some((key) => !presentKeys.has(key))
    ) {
      throw new Error("All five production measurements must be configured");
    }

    const active = await ctx.db
      .query("productionLineSpecifications")
      .withIndex("by_organizationId_and_productId_and_status", (q) =>
        q
          .eq("organizationId", specification.organizationId)
          .eq("productId", specification.productId)
          .eq("status", "active"),
      )
      .unique();
    if (active) {
      await ctx.db.patch(active._id, { status: "superseded" });
    }
    await ctx.db.patch(specification._id, {
      status: "active",
      effectiveAt: Date.now(),
      publishedBy: authUser._id,
    });
    return specification._id;
  },
});
