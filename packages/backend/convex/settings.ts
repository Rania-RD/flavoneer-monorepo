import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import {
  languageValidator,
  signatureTypeValidator,
  unitsValidator,
  userSettingsReturnValidator,
} from "./validators";

export const get = query({
  args: {},
  returns: v.union(userSettingsReturnValidator, v.null()),
  handler: async (ctx) => {
    let authUser;
    try {
      authUser = await authComponent.getAuthUser(ctx);
    } catch {
      return null;
    }
    if (!authUser) {
      return null;
    }
    const userId = authUser._id;

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_settingsKey", (q) => q.eq("settingsKey", userId))
      .first();
    return settings;
  },
});

export const upsert = mutation({
  args: {
    units: v.optional(unitsValidator),
    darkMode: v.optional(v.boolean()),
    language: v.optional(languageValidator),
    appAlerts: v.optional(v.boolean()),
    emailSummaries: v.optional(v.boolean()),
    // Profile
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    signatureType: v.optional(signatureTypeValidator),
    signatureData: v.optional(v.string()),
    signatureFont: v.optional(v.string()),
  },
  returns: v.id("userSettings"),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }
    const userId = authUser._id;

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_settingsKey", (q) => q.eq("settingsKey", userId))
      .first();

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (args.units !== undefined) {
        updates.units = args.units;
      }
      if (args.darkMode !== undefined) {
        updates.darkMode = args.darkMode;
      }
      if (args.language !== undefined) {
        updates.language = args.language;
      }
      if (args.appAlerts !== undefined) {
        updates.appAlerts = args.appAlerts;
      }
      if (args.emailSummaries !== undefined) {
        updates.emailSummaries = args.emailSummaries;
      }

      // Profile updates
      if (args.name !== undefined) {
        updates.name = args.name;
      }
      if (args.title !== undefined) {
        updates.title = args.title;
      }
      if (args.email !== undefined) {
        updates.email = args.email;
      }
      if (args.avatarUrl !== undefined) {
        updates.avatarUrl = args.avatarUrl;
      }
      if (args.signatureType !== undefined) {
        updates.signatureType = args.signatureType;
      }
      if (args.signatureData !== undefined) {
        updates.signatureData = args.signatureData;
      }
      if (args.signatureFont !== undefined) {
        updates.signatureFont = args.signatureFont;
      }

      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }
    // Create with defaults
    return await ctx.db.insert("userSettings", {
      settingsKey: userId,
      units: args.units ?? "metric",
      darkMode: args.darkMode ?? false,
      language: args.language ?? "en",
      appAlerts: args.appAlerts ?? true,
      emailSummaries: args.emailSummaries ?? false,
      name: args.name ?? authUser.name ?? "",
      title: args.title ?? "",
      email: args.email ?? authUser.email ?? "",
      avatarUrl: args.avatarUrl ?? authUser.image ?? "",
      signatureType: args.signatureType,
      signatureData: args.signatureData,
      signatureFont: args.signatureFont,
    });
  },
});
