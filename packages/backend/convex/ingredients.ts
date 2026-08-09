import { v } from "convex/values";
import {
  findCompositeDependencies,
  findProjectIdsUsingIngredientCode,
} from "../lib/ingredients/dependencies";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { makeLocalizedString, selectLocalizedString } from "./localization";
import { normalizeInsNumber } from "./regulatoryHelpers";
import { languageValidator, localizedStringValidator } from "./validators";
import {
  requirePersonalOrWorkspaceAccess,
  requirePersonalOrWorkspaceScope,
} from "./workspaceAccess";

type TenantResource = {
  organizationId?: Doc<"ingredients">["organizationId"] | null;
  userId?: string | null;
};

function isInTenant(
  resource: TenantResource,
  organizationId: TenantResource["organizationId"],
  userId: string,
) {
  return organizationId
    ? resource.organizationId === organizationId
    : !resource.organizationId && resource.userId === userId;
}

async function requireSubIngredientsInTenant(
  ctx: Parameters<typeof requirePersonalOrWorkspaceAccess>[0],
  subIngredients: Array<{ ingredientId: Doc<"ingredients">["_id"] }> | undefined,
  tenant: TenantResource,
  userId: string,
) {
  for (const subIngredient of subIngredients ?? []) {
    const ingredient = await ctx.db.get(subIngredient.ingredientId);
    if (!ingredient) {
      throw new Error("Sub-ingredient not found");
    }
    await requirePersonalOrWorkspaceAccess(ctx, ingredient);
    if (!isInTenant(ingredient, tenant.organizationId, userId)) {
      throw new Error("Sub-ingredient belongs to a different workspace");
    }
  }
}

export const list = query({
  args: {
    language: v.optional(languageValidator),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const scope = await requirePersonalOrWorkspaceScope(ctx, args.organizationId);
    const ingredients = await ctx.db
      .query("ingredients")
      .filter((q) =>
        scope.organizationId
          ? q.eq(q.field("organizationId"), scope.organizationId)
          : q.and(
              q.eq(q.field("organizationId"), undefined),
              q.eq(q.field("userId"), scope.userId),
            ),
      )
      .order("desc")
      .collect();

    const ingredientsWithUrls = await Promise.all(
      ingredients.map(async (ing) => {
        let coverImageUrl: string | null | undefined;
        if (ing.coverImageId) {
          coverImageUrl = await ctx.storage.getUrl(ing.coverImageId);
        }
        return {
          ...ing,
          name: selectLocalizedString(ing.name, ing.nameI18n, args.language),
          commonName: selectLocalizedString(ing.commonName, ing.commonNameI18n, args.language),
          coverImageUrl,
        };
      }),
    );

    return ingredientsWithUrls;
  },
});

export const listFormulationOptions = query({
  args: {
    language: v.optional(languageValidator),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const scope = await requirePersonalOrWorkspaceScope(ctx, args.organizationId);
    const ingredients = await ctx.db
      .query("ingredients")
      .filter((q) =>
        scope.organizationId
          ? q.eq(q.field("organizationId"), scope.organizationId)
          : q.and(
              q.eq(q.field("organizationId"), undefined),
              q.eq(q.field("userId"), scope.userId),
            ),
      )
      .order("desc")
      .collect();

    return ingredients.map((ingredient) => ({
      _id: ingredient._id,
      name: selectLocalizedString(ingredient.name, ingredient.nameI18n, args.language),
      nameI18n: makeLocalizedString(ingredient.name, ingredient.nameI18n),
      code: ingredient.code,
      status: ingredient.status,
      conversions: ingredient.conversions,
      costPerKg: ingredient.costPerKg ?? ingredient.price,
      nutrientValues: ingredient.nutrientValues,
      allergenValues: ingredient.allergenValues,
      subAllergenValues: ingredient.subAllergenValues,
      isAdditive: ingredient.isAdditive,
      insNumber: ingredient.insNumber,
      normalizedInsNumber: ingredient.normalizedInsNumber,
    }));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    nameI18n: v.optional(localizedStringValidator),
    commonName: v.optional(v.string()),
    commonNameI18n: v.optional(localizedStringValidator),
    groupId: v.optional(v.string()),
    isnAr: v.optional(v.string()),
    isnEn: v.optional(v.string()),
    code: v.optional(v.string()),
    isAdditive: v.optional(v.boolean()),
    insNumber: v.optional(v.string()),
    yieldAmount: v.number(),
    moistureLoss: v.number(),
    costPerKg: v.optional(v.float64()),
    nutrientValues: v.optional(
      v.array(
        v.object({
          nutrientName: v.string(),
          value: v.number(),
          unit: v.string(),
        }),
      ),
    ),
    allergenValues: v.optional(v.array(v.string())),
    allergenRegion: v.optional(v.string()),
    allergenVerified: v.optional(v.boolean()),
    subAllergenValues: v.optional(v.record(v.string(), v.array(v.string()))),
    density: v.optional(v.number()),
    conversions: v.optional(
      v.array(
        v.object({
          unit: v.string(),
          grams: v.number(),
        }),
      ),
    ),
    isComposite: v.optional(v.boolean()),
    subIngredients: v.optional(
      v.array(
        v.object({
          ingredientId: v.id("ingredients"),
          percentage: v.number(),
        }),
      ),
    ),
    organizationId: v.optional(v.id("organizations")),
    coverImageId: v.optional(v.id("_storage")),
    status: v.optional(v.union(v.literal("Draft"), v.literal("Approved"))),
  },
  handler: async (ctx, args) => {
    const scope = await requirePersonalOrWorkspaceScope(ctx, args.organizationId);
    await requireSubIngredientsInTenant(ctx, args.subIngredients, scope, scope.userId);

    const normalizedInsNumber = args.isAdditive ? normalizeInsNumber(args.insNumber) : "";
    const matchedAdditive = normalizedInsNumber
      ? await ctx.db
          .query("foodAdditives")
          .withIndex("by_normalizedInsNumber", (q) =>
            q.eq("normalizedInsNumber", normalizedInsNumber),
          )
          .first()
      : null;

    const newIngredientId = await ctx.db.insert("ingredients", {
      ...args,
      nameI18n: makeLocalizedString(args.name, args.nameI18n),
      commonNameI18n: makeLocalizedString(args.commonName, args.commonNameI18n),
      insNumber: normalizedInsNumber || undefined,
      normalizedInsNumber: normalizedInsNumber || undefined,
      foodAdditiveId: matchedAdditive?._id,
      status: args.status ?? "Draft",
      userId: scope.userId,
      organizationId: scope.organizationId,
      createdAt: Date.now(),
    });

    return newIngredientId;
  },
});

export const update = mutation({
  args: {
    id: v.id("ingredients"),
    name: v.string(),
    nameI18n: v.optional(localizedStringValidator),
    commonName: v.optional(v.string()),
    commonNameI18n: v.optional(localizedStringValidator),
    groupId: v.optional(v.string()),
    isnAr: v.optional(v.string()),
    isnEn: v.optional(v.string()),
    code: v.optional(v.string()),
    isAdditive: v.optional(v.boolean()),
    insNumber: v.optional(v.string()),
    yieldAmount: v.number(),
    moistureLoss: v.number(),
    costPerKg: v.optional(v.float64()),
    nutrientValues: v.optional(
      v.array(
        v.object({
          nutrientName: v.string(),
          value: v.number(),
          unit: v.string(),
        }),
      ),
    ),
    allergenValues: v.optional(v.array(v.string())),
    allergenRegion: v.optional(v.string()),
    allergenVerified: v.optional(v.boolean()),
    subAllergenValues: v.optional(v.record(v.string(), v.array(v.string()))),
    density: v.optional(v.number()),
    conversions: v.optional(
      v.array(
        v.object({
          unit: v.string(),
          grams: v.number(),
        }),
      ),
    ),
    isComposite: v.optional(v.boolean()),
    subIngredients: v.optional(
      v.array(
        v.object({
          ingredientId: v.id("ingredients"),
          percentage: v.number(),
        }),
      ),
    ),
    organizationId: v.optional(v.id("organizations")),
    coverImageId: v.optional(v.id("_storage")),
    status: v.optional(v.union(v.literal("Draft"), v.literal("Approved"))),
  },
  handler: async (ctx, args) => {
    const existingIngredient = await ctx.db.get(args.id);
    if (!existingIngredient) {
      throw new Error("Ingredient not found");
    }
    const authUser = await requirePersonalOrWorkspaceAccess(ctx, existingIngredient);
    const nextOrganizationId = args.organizationId ?? existingIngredient.organizationId;
    if (nextOrganizationId !== existingIngredient.organizationId) {
      await requirePersonalOrWorkspaceScope(ctx, nextOrganizationId);
    }
    await requireSubIngredientsInTenant(
      ctx,
      args.subIngredients,
      { organizationId: nextOrganizationId },
      authUser._id,
    );

    const { id, organizationId: _organizationId, ...rest } = args;
    const normalizedInsNumber = args.isAdditive ? normalizeInsNumber(args.insNumber) : "";
    const matchedAdditive = normalizedInsNumber
      ? await ctx.db
          .query("foodAdditives")
          .withIndex("by_normalizedInsNumber", (q) =>
            q.eq("normalizedInsNumber", normalizedInsNumber),
          )
          .first()
      : null;

    await ctx.db.patch(id, {
      ...rest,
      nameI18n: makeLocalizedString(args.name, args.nameI18n),
      commonNameI18n: makeLocalizedString(args.commonName, args.commonNameI18n),
      insNumber: normalizedInsNumber || undefined,
      normalizedInsNumber: normalizedInsNumber || undefined,
      foodAdditiveId: matchedAdditive?._id,
      organizationId: nextOrganizationId,
    });
  },
});

export const getDependencies = query({
  args: { id: v.id("ingredients"), code: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const ingredient = await ctx.db.get(args.id);
    if (!ingredient) {
      throw new Error("Ingredient not found");
    }
    const authUser = await requirePersonalOrWorkspaceAccess(ctx, ingredient);
    const allIngredients = (await ctx.db.query("ingredients").collect()).filter((candidate) =>
      isInTenant(candidate, ingredient.organizationId, authUser._id),
    );

    const composites = findCompositeDependencies(allIngredients, args.id);

    let formulas: Doc<"projects">[] = [];
    if (args.code && args.code.trim() !== "") {
      const linkedInventory = await ctx.db
        .query("inventoryItems")
        .filter((q) => q.eq(q.field("ingredientCode"), args.code))
        .collect();
      const scopedInventory = linkedInventory.filter((item) =>
        isInTenant(item, ingredient.organizationId, authUser._id),
      );

      if (scopedInventory.length > 0) {
        const allSteps = await ctx.db.query("recipeSteps").collect();
        const uniqueProjectIds = findProjectIdsUsingIngredientCode({
          ingredientCode: args.code,
          inventoryItems: scopedInventory,
          recipeSteps: allSteps,
        });

        const loadedFormulas = await Promise.all(
          uniqueProjectIds.map(async (pid) => await ctx.db.get(pid)),
        );
        formulas = loadedFormulas.filter(
          (formula): formula is Doc<"projects"> =>
            formula !== null && isInTenant(formula, ingredient.organizationId, authUser._id),
        );
      }
    }

    return {
      composites,
      formulas,
    };
  },
});

export const markDependenciesOutOfSync = mutation({
  args: { id: v.id("ingredients") },
  handler: async (ctx, args) => {
    const ingredient = await ctx.db.get(args.id);
    if (!ingredient) {
      throw new Error("Ingredient not found");
    }
    const authUser = await requirePersonalOrWorkspaceAccess(ctx, ingredient);
    const allIngredients = (await ctx.db.query("ingredients").collect()).filter((candidate) =>
      isInTenant(candidate, ingredient.organizationId, authUser._id),
    );

    const composites = findCompositeDependencies(allIngredients, args.id);

    for (const comp of composites) {
      await ctx.db.patch(comp._id, { outOfSync: true });
    }
    return composites.length;
  },
});

export const propagateUpdates = mutation({
  args: { id: v.id("ingredients") },
  handler: async (ctx, args) => {
    const ingredient = await ctx.db.get(args.id);
    if (!ingredient) {
      throw new Error("Ingredient not found");
    }
    const authUser = await requirePersonalOrWorkspaceAccess(ctx, ingredient);
    const allIngredients = (await ctx.db.query("ingredients").collect()).filter((candidate) =>
      isInTenant(candidate, ingredient.organizationId, authUser._id),
    );

    // Find composites depending directly on the modified ingredient
    const composites = findCompositeDependencies(allIngredients, args.id);

    const ingredientMap = new Map(allIngredients.map((i) => [i._id, i]));
    let updatedCount = 0;

    for (const comp of composites) {
      if (!comp.subIngredients) {
        continue;
      }

      const newNutrientMap = new Map<string, { value: number; unit: string }>();

      for (const sub of comp.subIngredients) {
        const sourceData = ingredientMap.get(sub.ingredientId);
        if (sourceData && sourceData.nutrientValues) {
          const factor = sub.percentage / 100;
          for (const nv of sourceData.nutrientValues) {
            const current = newNutrientMap.get(nv.nutrientName);
            if (current) {
              current.value += nv.value * factor;
            } else {
              newNutrientMap.set(nv.nutrientName, {
                value: nv.value * factor,
                unit: nv.unit,
              });
            }
          }
        }
      }

      const updatedNutrientValues = Array.from(newNutrientMap.entries()).map(([name, data]) => ({
        nutrientName: name,
        value: Number(data.value.toFixed(2)),
        unit: data.unit,
      }));

      await ctx.db.patch(comp._id, {
        nutrientValues: updatedNutrientValues,
        outOfSync: false,
      });

      // Update our local map to serve propagating N-depth naturally if we sorted them
      // (Since we are doing a 1-level sweep right now, N-depth would require
      // topological sorting. But 1-level is structurally correct for this action).
      comp.nutrientValues = updatedNutrientValues;
      ingredientMap.set(comp._id, comp);
      updatedCount++;
    }

    return updatedCount;
  },
});

export const remove = mutation({
  args: { id: v.id("ingredients") },
  handler: async (ctx, args) => {
    const ingredient = await ctx.db.get(args.id);
    if (!ingredient) {
      throw new Error("Ingredient not found");
    }
    const authUser = await requirePersonalOrWorkspaceAccess(ctx, ingredient);

    const allIngredients = (await ctx.db.query("ingredients").collect()).filter((candidate) =>
      isInTenant(candidate, ingredient.organizationId, authUser._id),
    );
    const composites = findCompositeDependencies(allIngredients, args.id);

    let formulas: Doc<"projects">[] = [];
    if (ingredient.code && ingredient.code.trim() !== "") {
      const linkedInventory = await ctx.db
        .query("inventoryItems")
        .filter((q) => q.eq(q.field("ingredientCode"), ingredient.code))
        .collect();
      const scopedInventory = linkedInventory.filter((item) =>
        isInTenant(item, ingredient.organizationId, authUser._id),
      );

      if (scopedInventory.length > 0) {
        const allSteps = await ctx.db.query("recipeSteps").collect();
        const uniqueProjectIds = findProjectIdsUsingIngredientCode({
          ingredientCode: ingredient.code,
          inventoryItems: scopedInventory,
          recipeSteps: allSteps,
        });
        const loadedFormulas = await Promise.all(
          uniqueProjectIds.map(async (pid) => await ctx.db.get(pid)),
        );
        formulas = loadedFormulas.filter(
          (formula): formula is Doc<"projects"> =>
            formula !== null && isInTenant(formula, ingredient.organizationId, authUser._id),
        );
      }
    }

    if (composites.length > 0 || formulas.length > 0) {
      throw new Error("عذراً، لا يمكنك حذف هذا المكون لأنه مستخدم في تركيبات أو مشاريع أخرى.");
    }

    await ctx.db.delete(args.id);
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("ingredients"),
    status: v.union(v.literal("Draft"), v.literal("Approved")),
  },
  handler: async (ctx, args) => {
    const ingredient = await ctx.db.get(args.id);
    if (!ingredient) {
      throw new Error("Ingredient not found");
    }
    await requirePersonalOrWorkspaceAccess(ctx, ingredient);
    return await ctx.db.patch(args.id, { status: args.status });
  },
});
