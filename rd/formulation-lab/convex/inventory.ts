import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { makeLocalizedString, selectLocalizedString } from "./localization";
import {
  enrichedInventoryReturnValidator,
  languageValidator,
  localizedStringValidator,
  materialUsageLogReturnValidator,
} from "./validators";

// ── Helpers ──────────────────────────────────────────

function computeStockStatus(
  stock: number,
  lowStockThreshold?: number
): "ok" | "low" {
  const threshold = lowStockThreshold ?? stock * 0.2;
  return stock <= threshold ? "low" : "ok";
}

// ── Enrichment helper: compute derived fields at read time ──
// NOTE: expiry computation uses current time. Convex queries should ideally
// be deterministic, but this is an accepted pattern for time-based reads.
function enrichItem(
  item: Doc<"inventoryItems">,
  nowMs: number,
  language?: string
) {
  let expiryStatus = "ok";
  let expiryDays: number | undefined;
  if (item.expiryDate) {
    const today = new Date(nowMs);
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(item.expiryDate);
    if (!isNaN(expiry.getTime())) {
      const diffMs = expiry.getTime() - today.getTime();
      expiryDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (expiryDays <= 30) {
        expiryStatus = "expiring";
      }
    }
  }

  return {
    ...item,
    name: selectLocalizedString(item.name, item.nameI18n, language),
    nameI18n: makeLocalizedString(item.name, item.nameI18n),
    description: selectLocalizedString(
      item.description,
      item.descriptionI18n,
      language
    ),
    descriptionI18n: makeLocalizedString(
      item.description,
      item.descriptionI18n
    ),
    category: selectLocalizedString(item.category, item.categoryI18n, language),
    categoryI18n: makeLocalizedString(item.category, item.categoryI18n),
    supplier: selectLocalizedString(item.supplier, item.supplierI18n, language),
    supplierI18n: makeLocalizedString(item.supplier, item.supplierI18n),
    storageConditions: selectLocalizedString(
      item.storageConditions,
      item.storageConditionsI18n,
      language
    ),
    storageConditionsI18n: makeLocalizedString(
      item.storageConditions,
      item.storageConditionsI18n
    ),
    expiryStatus,
    expiryDays,
  };
}

export const list = query({
  args: {
    category: v.optional(v.string()),
    language: v.optional(languageValidator),
  },
  returns: v.array(enrichedInventoryReturnValidator),
  handler: async (ctx, args) => {
    let items;
    if (args.category) {
      items = await ctx.db
        .query("inventoryItems")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    } else {
      items = await ctx.db.query("inventoryItems").collect();
    }

    const nowMs = Date.now();

    // Enrich each item and compute usedIn from materialUsageLogs
    const enriched = [];
    for (const item of items) {
      const logs = await ctx.db
        .query("materialUsageLogs")
        .withIndex("by_inventoryItemId", (q) =>
          q.eq("inventoryItemId", item._id)
        )
        .collect();

      // Deduplicate projects by projectId
      const projectMap = new Map<string, string>();
      for (const log of logs) {
        if (!projectMap.has(log.projectId)) {
          projectMap.set(
            log.projectId,
            selectLocalizedString(
              log.projectName,
              log.projectNameI18n,
              args.language
            )
          );
        }
      }
      const usedIn = Array.from(projectMap, ([id, name]) => ({ id, name }));

      enriched.push({ ...enrichItem(item, nowMs, args.language), usedIn });
    }

    return enriched;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    nameI18n: v.optional(localizedStringValidator),
    description: v.string(),
    descriptionI18n: v.optional(localizedStringValidator),
    category: v.string(),
    categoryI18n: v.optional(localizedStringValidator),
    batchId: v.string(),
    stock: v.number(),
    unit: v.string(),
    expiryDate: v.string(),
    price: v.optional(v.number()),
    lowStockThreshold: v.optional(v.number()),
    supplier: v.optional(v.string()),
    supplierI18n: v.optional(localizedStringValidator),
    storageConditions: v.optional(v.string()),
    storageConditionsI18n: v.optional(localizedStringValidator),
    ingredientCode: v.optional(v.string()),
    ingredientId: v.id("ingredients"),
  },
  returns: v.id("inventoryItems"),
  handler: async (ctx, args) => {
    const stockStatus = computeStockStatus(args.stock, args.lowStockThreshold);
    return await ctx.db.insert("inventoryItems", {
      ...args,
      nameI18n: makeLocalizedString(args.name, args.nameI18n),
      descriptionI18n: makeLocalizedString(
        args.description,
        args.descriptionI18n
      ),
      categoryI18n: makeLocalizedString(args.category, args.categoryI18n),
      supplierI18n: makeLocalizedString(args.supplier, args.supplierI18n),
      storageConditionsI18n: makeLocalizedString(
        args.storageConditions,
        args.storageConditionsI18n
      ),
      stockStatus,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("inventoryItems"),
    name: v.optional(v.string()),
    nameI18n: v.optional(localizedStringValidator),
    description: v.optional(v.string()),
    descriptionI18n: v.optional(localizedStringValidator),
    category: v.optional(v.string()),
    categoryI18n: v.optional(localizedStringValidator),
    batchId: v.optional(v.string()),
    stock: v.optional(v.number()),
    unit: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    price: v.optional(v.number()),
    lowStockThreshold: v.optional(v.number()),
    supplier: v.optional(v.string()),
    supplierI18n: v.optional(localizedStringValidator),
    storageConditions: v.optional(v.string()),
    storageConditionsI18n: v.optional(localizedStringValidator),
    ingredientCode: v.optional(v.string()),
    ingredientId: v.optional(v.id("ingredients")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    // If stock or threshold changes, recompute status
    let stockStatusUpdate: { stockStatus?: "ok" | "low" } = {};
    if (
      updates.stock !== undefined ||
      updates.lowStockThreshold !== undefined
    ) {
      const currentItem = await ctx.db.get(id);
      if (currentItem) {
        const newStock = updates.stock ?? currentItem.stock;
        const newThreshold =
          updates.lowStockThreshold ?? currentItem.lowStockThreshold;
        stockStatusUpdate = {
          stockStatus: computeStockStatus(newStock, newThreshold),
        };
      }
    }

    const localizedUpdates = {
      ...updates,
      ...(updates.name !== undefined || updates.nameI18n !== undefined
        ? { nameI18n: makeLocalizedString(updates.name, updates.nameI18n) }
        : {}),
      ...(updates.description !== undefined ||
      updates.descriptionI18n !== undefined
        ? {
            descriptionI18n: makeLocalizedString(
              updates.description,
              updates.descriptionI18n
            ),
          }
        : {}),
      ...(updates.category !== undefined || updates.categoryI18n !== undefined
        ? {
            categoryI18n: makeLocalizedString(
              updates.category,
              updates.categoryI18n
            ),
          }
        : {}),
      ...(updates.supplier !== undefined || updates.supplierI18n !== undefined
        ? {
            supplierI18n: makeLocalizedString(
              updates.supplier,
              updates.supplierI18n
            ),
          }
        : {}),
      ...(updates.storageConditions !== undefined ||
      updates.storageConditionsI18n !== undefined
        ? {
            storageConditionsI18n: makeLocalizedString(
              updates.storageConditions,
              updates.storageConditionsI18n
            ),
          }
        : {}),
    };
    const filtered = Object.fromEntries(
      Object.entries(localizedUpdates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, { ...filtered, ...stockStatusUpdate });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("inventoryItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

export const getUsageHistory = query({
  args: { inventoryItemId: v.id("inventoryItems") },
  returns: v.array(materialUsageLogReturnValidator),
  handler: async (ctx, args) =>
    await ctx.db
      .query("materialUsageLogs")
      .withIndex("by_inventoryItemId", (q) =>
        q.eq("inventoryItemId", args.inventoryItemId)
      )
      .collect(),
});

export const bulkRemove = mutation({
  args: { ids: v.array(v.id("inventoryItems")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Delete all requested items sequentially (Convex runs this atomically in one transaction)
    for (const id of args.ids) {
      await ctx.db.delete(id);
    }
    return null;
  },
});

export const bulkUpdateStatus = mutation({
  args: {
    ids: v.array(v.id("inventoryItems")),
    stockStatus: v.union(v.literal("ok"), v.literal("low")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // We are overriding the derived logic for explicit status
    for (const id of args.ids) {
      // Typically stockStatus is computed, but if a user explicitly bulk overrides it via Change Status,
      // it writes strictly the requested status in this transaction.
      await ctx.db.patch(id, { stockStatus: args.stockStatus });
    }
    return null;
  },
});
