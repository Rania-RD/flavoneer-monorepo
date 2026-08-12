import { v } from "convex/values";
<<<<<<< HEAD
import { query } from "./_generated/server";

/**
 * Compatibility endpoints for clients that predate the removal of the lab
 * samples workspace. The feature has no backing table in the current schema,
 * so returning empty data is safer than exposing unrelated laboratory data.
 *
 * These can be removed after all deployed clients have rolled forward.
 */
export const getReferenceData = query({
  args: {
    language: v.optional(v.union(v.literal("en"), v.literal("ar"))),
    organizationId: v.optional(v.id("organizations")),
  },
  returns: v.object({
    equipment: v.array(v.any()),
    ingredients: v.array(v.any()),
    projects: v.array(v.any()),
  }),
  handler: async () => ({
    equipment: [],
    ingredients: [],
    projects: [],
  }),
});

export const listRecent = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
  },
  returns: v.array(v.any()),
  handler: async () => [],
=======
import { mutation, query } from "./_generated/server";
import { buildLabSampleNumber, getSampleYear, normalizeProductionNumber } from "./labSampleHelpers";
import { selectLocalizedString } from "./localization";
import { requirePermission } from "./permissions";
import { labSampleTypeValidator, languageValidator } from "./validators";
import { requireWorkspaceMember } from "./workspaceAccess";

const productOptionValidator = v.object({
  id: v.string(),
  name: v.string(),
});

const sampleSummaryValidator = v.object({
  _id: v.id("labSampleSubmissions"),
  notes: v.optional(v.string()),
  productName: v.string(),
  productionNumber: v.string(),
  sampleLocation: v.string(),
  sampleNumber: v.string(),
  sampleType: labSampleTypeValidator,
  sampledAt: v.number(),
  submittedByName: v.string(),
});

export const getReferenceData = query({
  args: {
    language: v.optional(languageValidator),
    organizationId: v.id("organizations"),
  },
  returns: v.object({
    finishedProducts: v.array(productOptionValidator),
    rawMaterials: v.array(productOptionValidator),
  }),
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.organizationId);
    await requirePermission(ctx, args.organizationId, "record_production_checks");

    const [ingredients, projects] = await Promise.all([
      ctx.db
        .query("ingredients")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
        .order("desc")
        .take(250),
      ctx.db
        .query("projects")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
        .order("desc")
        .take(250),
    ]);

    return {
      rawMaterials: ingredients.map((ingredient) => ({
        id: ingredient._id,
        name: selectLocalizedString(ingredient.name, ingredient.nameI18n, args.language),
      })),
      finishedProducts: projects.map((project) => ({
        id: project._id,
        name: selectLocalizedString(project.name, project.nameI18n, args.language),
      })),
    };
  },
});

export const listRecent = query({
  args: { organizationId: v.id("organizations") },
  returns: v.array(sampleSummaryValidator),
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.organizationId);
    await requirePermission(ctx, args.organizationId, "view_production_checks");
    const samples = await ctx.db
      .query("labSampleSubmissions")
      .withIndex("by_organizationId_and_sampledAt", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .order("desc")
      .take(50);

    return samples.map((sample) => ({
      _id: sample._id,
      notes: sample.notes,
      productName: sample.productName,
      productionNumber: sample.productionNumber,
      sampleLocation: sample.sampleLocation,
      sampleNumber: sample.sampleNumber,
      sampleType: sample.sampleType,
      sampledAt: sample.sampledAt,
      submittedByName: sample.submittedByName,
    }));
  },
});

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    product: v.union(
      v.object({
        ingredientId: v.id("ingredients"),
        sampleType: v.literal("raw_material"),
      }),
      v.object({
        projectId: v.id("projects"),
        sampleType: v.literal("final_product"),
      }),
    ),
    productionNumber: v.string(),
    sampleLocation: v.string(),
    sampledAt: v.number(),
    notes: v.optional(v.string()),
  },
  returns: v.object({
    sampleId: v.id("labSampleSubmissions"),
    sampleNumber: v.string(),
  }),
  handler: async (ctx, args) => {
    const { authUser } = await requireWorkspaceMember(ctx, args.organizationId);
    await requirePermission(ctx, args.organizationId, "record_production_checks");

    const sampleLocation = args.sampleLocation.trim();
    const notes = args.notes?.trim() || undefined;
    if (!sampleLocation) {
      throw new Error("Sample location is required");
    }
    if (sampleLocation.length > 160) {
      throw new Error("Sample location must be 160 characters or fewer");
    }
    if (notes && notes.length > 2000) {
      throw new Error("Notes must be 2000 characters or fewer");
    }
    const productionNumber = normalizeProductionNumber(args.productionNumber);

    const source =
      args.product.sampleType === "raw_material"
        ? await ctx.db.get(args.product.ingredientId)
        : await ctx.db.get(args.product.projectId);
    if (!source || source.organizationId !== args.organizationId) {
      throw new Error("Selected product does not belong to this workspace");
    }

    const settings = await ctx.db
      .query("productionLineSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .unique();
    const sampleYear = getSampleYear(args.sampledAt, settings?.timezone ?? "UTC");
    const counter = await ctx.db
      .query("labSampleSerialCounters")
      .withIndex("by_organizationId_and_sampleType_and_year", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("sampleType", args.product.sampleType)
          .eq("year", sampleYear),
      )
      .unique();
    const serialSequence = counter?.nextSequence ?? 1;
    const sampleNumber = buildLabSampleNumber(args.product.sampleType, sampleYear, serialSequence);
    const now = Date.now();
    const productFields =
      args.product.sampleType === "raw_material"
        ? { ingredientId: args.product.ingredientId }
        : { projectId: args.product.projectId };
    const sampleId = await ctx.db.insert("labSampleSubmissions", {
      organizationId: args.organizationId,
      sampleType: args.product.sampleType,
      sampleYear,
      serialSequence,
      sampleNumber,
      ...productFields,
      productName: source.name,
      productionNumber,
      sampleLocation,
      sampledAt: args.sampledAt,
      notes,
      submittedBy: authUser._id,
      submittedByName: authUser.name ?? authUser.email ?? "Unknown",
      createdAt: now,
    });

    if (counter) {
      await ctx.db.patch(counter._id, {
        nextSequence: serialSequence + 1,
        updatedAt: now,
        updatedBy: authUser._id,
      });
    } else {
      await ctx.db.insert("labSampleSerialCounters", {
        organizationId: args.organizationId,
        sampleType: args.product.sampleType,
        year: sampleYear,
        nextSequence: serialSequence + 1,
        updatedAt: now,
        updatedBy: authUser._id,
      });
    }

    return { sampleId, sampleNumber };
  },
>>>>>>> c9abb110d463c8ebc5dea06eca5f146b9bf0e561
});
