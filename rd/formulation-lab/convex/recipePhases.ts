import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { stepTypeValidator } from "./validators";

// ── Queries ─────────────────────────────────────────

// Returns phases with their steps joined, sorted by sortOrder

// ── Phase Mutations ─────────────────────────────────

export const updatePhase = mutation({
  args: {
    id: v.id("recipePhases"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
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

// ── Step Mutations ──────────────────────────────────

export const updateStep = mutation({
  args: {
    id: v.id("recipeSteps"),
    type: v.optional(stepTypeValidator),
    label: v.optional(v.string()),
    notes: v.optional(v.string()),
    ingredientId: v.optional(v.string()),
    expectedWeight: v.optional(v.number()),
    maxLimitPercent: v.optional(v.number()),
    unit: v.optional(v.string()),
    tolerance: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    processTemp: v.optional(v.number()),
    processSpeed: v.optional(v.string()),
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
