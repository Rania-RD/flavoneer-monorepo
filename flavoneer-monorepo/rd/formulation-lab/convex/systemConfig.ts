import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

/**
 * Get the traceability configuration.
 * Creates a default one if it doesn't exist.
 */
export const getTraceabilityConfig = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_configKey", (q) => q.eq("configKey", "traceability"))
      .first();

    if (!config) {
      // Return default for UI purposes, but we also create it on first read if possible...
      // Wait, queries can't mutate. We'll return a default if null.
      return {
        configKey: "traceability",
        idPrefix: "FD-",
        currentIdNumber: 1,
      };
    }

    return config;
  },
});

/**
 * Update the traceability configuration (Admin only).
 */
export const updateTraceabilityConfig = mutation({
  args: {
    idPrefix: v.string(),
    currentIdNumber: v.number(),
  },
  handler: async (ctx, args) => {
    // Auth check - Optional but good practice. Ensure admin.
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_configKey", (q) => q.eq("configKey", "traceability"))
      .first();

    if (config) {
      await ctx.db.patch(config._id, {
        idPrefix: args.idPrefix,
        currentIdNumber: args.currentIdNumber,
      });
    } else {
      await ctx.db.insert("systemConfig", {
        configKey: "traceability",
        idPrefix: args.idPrefix,
        currentIdNumber: args.currentIdNumber,
      });
    }

    return true;
  },
});

/**
 * Get the version control configuration.
 */
export const getVersionControlConfig = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_configKey", (q) => q.eq("configKey", "versionControl"))
      .first();

    if (!config) {
      // Return default for UI purposes
      return {
        configKey: "versionControl",
        versionPrefix: "V",
        versionStyle: "major-minor",
        autoIncrementVersion: false,
      };
    }

    return config;
  },
});

/**
 * Update the version control configuration (Admin only).
 */
export const updateVersionControlConfig = mutation({
  args: {
    versionPrefix: v.string(),
    versionStyle: v.string(),
    autoIncrementVersion: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Auth check - Optional but good practice. Ensure admin.
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_configKey", (q) => q.eq("configKey", "versionControl"))
      .first();

    if (config) {
      await ctx.db.patch(config._id, {
        versionPrefix: args.versionPrefix,
        versionStyle: args.versionStyle,
        autoIncrementVersion: args.autoIncrementVersion,
      });
    } else {
      await ctx.db.insert("systemConfig", {
        configKey: "versionControl",
        versionPrefix: args.versionPrefix,
        versionStyle: args.versionStyle,
        autoIncrementVersion: args.autoIncrementVersion,
      });
    }

    return true;
  },
});
