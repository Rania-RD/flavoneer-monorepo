import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  normalizeInsNumber,
  parentCategoryCodes,
  plainInsNumber,
} from "./regulatoryHelpers";

const categoryImportValidator = v.object({
  code: v.string(),
  name: v.string(),
});

const additiveImportValidator = v.object({
  name: v.string(),
  insNumber: v.string(),
  sourceENumber: v.optional(v.string()),
  codexId: v.optional(v.number()),
  groupName: v.optional(v.string()),
});

const limitImportValidator = v.object({
  categoryCode: v.string(),
  insNumber: v.string(),
  mgPerKg: v.number(),
  source: v.optional(v.string()),
});

export const searchFoodCategories = query({
  args: {
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 100);
    const search = args.search?.trim().toLowerCase();
    const categories = await ctx.db.query("foodCategories").collect();

    return categories
      .filter((category) => {
        if (!search) {
          return true;
        }
        return (
          category.code.toLowerCase().includes(search) ||
          category.name.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
      .slice(0, limit);
  },
});

export const getAdditiveMatch = query({
  args: {
    insNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedInsNumber = normalizeInsNumber(args.insNumber);
    if (!normalizedInsNumber) {
      return null;
    }

    return await ctx.db
      .query("foodAdditives")
      .withIndex("by_normalizedInsNumber", (q) =>
        q.eq("normalizedInsNumber", normalizedInsNumber)
      )
      .first();
  },
});

export const getProjectAdditiveLimits = query({
  args: {
    categoryCode: v.optional(v.string()),
    ingredientIds: v.array(v.id("ingredients")),
  },
  handler: async (ctx, args) => {
    const result: Record<
      string,
      | {
          status: "category_missing" | "not_additive" | "not_found";
        }
      | {
          status: "found";
          categoryCode: string;
          categoryName: string;
          additiveName: string;
          insNumber: string;
          mgPerKg: number;
        }
    > = {};

    for (const ingredientId of args.ingredientIds) {
      const ingredient = await ctx.db.get(ingredientId);
      if (!(ingredient?.isAdditive && ingredient.normalizedInsNumber)) {
        result[ingredientId] = { status: "not_additive" };
        continue;
      }

      if (!args.categoryCode) {
        result[ingredientId] = { status: "category_missing" };
        continue;
      }

      let matchedLimit:
        | {
            categoryCode: string;
            mgPerKg: number;
            foodCategoryId: Id<"foodCategories">;
          }
        | null = null;

      for (const code of parentCategoryCodes(args.categoryCode)) {
        const limit = await ctx.db
          .query("additiveLimits")
          .withIndex("by_categoryCode_normalizedInsNumber", (q) =>
            q
              .eq("categoryCode", code)
              .eq("normalizedInsNumber", ingredient.normalizedInsNumber!)
          )
          .first();

        if (limit) {
          matchedLimit = limit;
          break;
        }
      }

      if (!matchedLimit) {
        result[ingredientId] = { status: "not_found" };
        continue;
      }

      const [category, additive] = await Promise.all([
        ctx.db.get(matchedLimit.foodCategoryId),
        ingredient.foodAdditiveId ? ctx.db.get(ingredient.foodAdditiveId) : null,
      ]);

      result[ingredientId] = {
        status: "found",
        categoryCode: matchedLimit.categoryCode,
        categoryName: category?.name ?? matchedLimit.categoryCode,
        additiveName: additive?.name ?? ingredient.name,
        insNumber: ingredient.normalizedInsNumber,
        mgPerKg: matchedLimit.mgPerKg,
      };
    }

    return result;
  },
});

export const importCatalogBatch = mutation({
  args: {
    token: v.optional(v.string()),
    categories: v.optional(v.array(categoryImportValidator)),
    additives: v.optional(v.array(additiveImportValidator)),
    limits: v.optional(v.array(limitImportValidator)),
  },
  handler: async (ctx, args) => {
    const requiredToken = process.env.REGULATORY_IMPORT_TOKEN;
    if (requiredToken && args.token !== requiredToken) {
      throw new Error("Invalid regulatory import token");
    }

    let categoriesImported = 0;
    let additivesImported = 0;
    let limitsImported = 0;
    const now = Date.now();

    for (const category of args.categories ?? []) {
      const existing = await ctx.db
        .query("foodCategories")
        .withIndex("by_code", (q) => q.eq("code", category.code))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          name: category.name,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("foodCategories", {
          code: category.code,
          name: category.name,
          createdAt: now,
          updatedAt: now,
        });
      }
      categoriesImported++;
    }

    for (const additive of args.additives ?? []) {
      const normalizedInsNumber = normalizeInsNumber(additive.insNumber);
      if (!normalizedInsNumber) {
        continue;
      }

      const existing = await ctx.db
        .query("foodAdditives")
        .withIndex("by_normalizedInsNumber", (q) =>
          q.eq("normalizedInsNumber", normalizedInsNumber)
        )
        .first();

      const payload = {
        name: additive.name,
        insNumber: normalizedInsNumber,
        normalizedInsNumber,
        sourceENumber: additive.sourceENumber,
        plainInsNumber: plainInsNumber(normalizedInsNumber),
        codexId: additive.codexId,
        groupName: additive.groupName,
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        await ctx.db.insert("foodAdditives", {
          ...payload,
          createdAt: now,
        });
      }
      additivesImported++;
    }

    for (const limit of args.limits ?? []) {
      const normalizedInsNumber = normalizeInsNumber(limit.insNumber);
      if (!normalizedInsNumber) {
        continue;
      }

      const [category, additive] = await Promise.all([
        ctx.db
          .query("foodCategories")
          .withIndex("by_code", (q) => q.eq("code", limit.categoryCode))
          .first(),
        ctx.db
          .query("foodAdditives")
          .withIndex("by_normalizedInsNumber", (q) =>
            q.eq("normalizedInsNumber", normalizedInsNumber)
          )
          .first(),
      ]);

      if (!(category && additive)) {
        continue;
      }

      const existing = await ctx.db
        .query("additiveLimits")
        .withIndex("by_categoryCode_normalizedInsNumber", (q) =>
          q
            .eq("categoryCode", limit.categoryCode)
            .eq("normalizedInsNumber", normalizedInsNumber)
        )
        .first();

      const payload = {
        additiveId: additive._id,
        foodCategoryId: category._id,
        categoryCode: limit.categoryCode,
        normalizedInsNumber,
        mgPerKg: limit.mgPerKg,
        source: limit.source,
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        await ctx.db.insert("additiveLimits", {
          ...payload,
          createdAt: now,
        });
      }
      limitsImported++;
    }

    return {
      categoriesImported,
      additivesImported,
      limitsImported,
    };
  },
});
