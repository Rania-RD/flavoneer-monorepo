import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import {
  languageValidator,
  themePreferenceValidator,
  unitsValidator,
  userSettingsReturnValidator,
} from "./validators";

export const get = query({
  args: {},
  returns: v.union(userSettingsReturnValidator, v.null()),
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx).catch(() => null);
    if (!authUser) {
      return null;
    }
    const userId = authUser._id;

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_settingsKey", (q) => q.eq("settingsKey", userId))
      .first();
    if (!settings) {
      return null;
    }

    const legacyProfile = settings.profile;
    const legacyIdentityProfile = legacyProfile
      ? {
          ...(legacyProfile.name !== undefined && { name: legacyProfile.name }),
          ...(legacyProfile.title !== undefined && { title: legacyProfile.title }),
          ...(legacyProfile.email !== undefined && { email: legacyProfile.email }),
          ...(legacyProfile.avatarUrl !== undefined && {
            avatarUrl: legacyProfile.avatarUrl,
          }),
        }
      : undefined;

    return {
      _id: settings._id,
      _creationTime: settings._creationTime,
      settingsKey: settings.settingsKey,
      units: settings.units,
      darkMode: settings.darkMode,
      ...(settings.themePreference !== undefined && {
        themePreference: settings.themePreference,
      }),
      language: settings.language,
      appAlerts: settings.appAlerts,
      emailSummaries: settings.emailSummaries,
      ...(settings.name !== undefined && { name: settings.name }),
      ...(settings.title !== undefined && { title: settings.title }),
      ...(settings.email !== undefined && { email: settings.email }),
      ...(settings.avatarUrl !== undefined && { avatarUrl: settings.avatarUrl }),
      ...(legacyIdentityProfile !== undefined && {
        profile: legacyIdentityProfile,
      }),
    };
  },
});

export const upsert = mutation({
  args: {
    units: v.optional(unitsValidator),
    darkMode: v.optional(v.boolean()),
    themePreference: v.optional(themePreferenceValidator),
    language: v.optional(languageValidator),
    appAlerts: v.optional(v.boolean()),
    emailSummaries: v.optional(v.boolean()),
    // Profile
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
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
        if (args.themePreference === undefined) {
          updates.themePreference = args.darkMode ? "dark" : "light";
        }
      }
      if (args.themePreference !== undefined) {
        updates.themePreference = args.themePreference;
        if (args.themePreference !== "system" && args.darkMode === undefined) {
          updates.darkMode = args.themePreference === "dark";
        }
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
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }
    // Create with defaults
    return await ctx.db.insert("userSettings", {
      settingsKey: userId,
      units: args.units ?? "metric",
      darkMode: args.darkMode ?? false,
      themePreference:
        args.themePreference ??
        (args.darkMode === undefined ? "system" : args.darkMode ? "dark" : "light"),
      language: args.language ?? "en",
      appAlerts: args.appAlerts ?? true,
      emailSummaries: args.emailSummaries ?? false,
      name: args.name ?? authUser.name ?? "",
      title: args.title ?? "",
      email: args.email ?? authUser.email ?? "",
      avatarUrl: args.avatarUrl ?? authUser.image ?? "",
    });
  },
});
