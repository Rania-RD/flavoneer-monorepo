import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { versionTagValidator } from "./validators";

// ── Queries ─────────────────────────────────────────

// ── Mutations ───────────────────────────────────────

// Atomic replace: delete all existing for this project+versionTag, insert new list

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    ingredientKey: v.string(),
    name: v.string(),
    weight: v.number(),
    percentage: v.optional(v.number()),
    costPerKg: v.optional(v.number()),
    versionTag: versionTagValidator,
    sortOrder: v.number(),
  },
  returns: v.id("projectIngredients"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("projectIngredients", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("projectIngredients"),
    name: v.optional(v.string()),
    weight: v.optional(v.number()),
    percentage: v.optional(v.number()),
    costPerKg: v.optional(v.number()),
    sortOrder: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filtered);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("projectIngredients") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

// Internal helper: delete all ingredients for a project (used on project deletion)
