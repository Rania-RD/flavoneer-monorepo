import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, type QueryCtx, query } from "./_generated/server";
import { requirePermission } from "./permissions";
import { requireWorkspaceMember } from "./workspaceAccess";

type SystemConfigKey = "traceability" | "versionControl";

/** Read the organization row, falling back to the legacy row during migration. */
export async function getOrganizationSystemConfig(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
  configKey: SystemConfigKey,
) {
  const scopedConfig = await ctx.db
    .query("systemConfig")
    .withIndex("by_organizationId_and_configKey", (q) =>
      q.eq("organizationId", organizationId).eq("configKey", configKey),
    )
    .unique();
  if (scopedConfig) {
    return scopedConfig;
  }

  return await ctx.db
    .query("systemConfig")
    .withIndex("by_organizationId_and_configKey", (q) =>
      q.eq("organizationId", undefined).eq("configKey", configKey),
    )
    .first();
}

/**
 * Get the traceability configuration.
 * Returns defaults when neither an organization nor legacy row exists.
 */
export const getTraceabilityConfig = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.organizationId);
    const config = await getOrganizationSystemConfig(ctx, args.organizationId, "traceability");

    if (!config) {
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
    organizationId: v.id("organizations"),
    idPrefix: v.string(),
    currentIdNumber: v.number(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.organizationId, "manage_roles");

    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_organizationId_and_configKey", (q) =>
        q.eq("organizationId", args.organizationId).eq("configKey", "traceability"),
      )
      .unique();

    if (config) {
      await ctx.db.patch(config._id, {
        idPrefix: args.idPrefix,
        currentIdNumber: args.currentIdNumber,
      });
    } else {
      await ctx.db.insert("systemConfig", {
        organizationId: args.organizationId,
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
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.organizationId, "manage_version_control");
    const config = await getOrganizationSystemConfig(ctx, args.organizationId, "versionControl");

    if (!config) {
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
 * Update version-control configuration with the dedicated workspace permission.
 */
export const updateVersionControlConfig = mutation({
  args: {
    organizationId: v.id("organizations"),
    versionPrefix: v.string(),
    versionStyle: v.string(),
    autoIncrementVersion: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.organizationId, "manage_version_control");

    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_organizationId_and_configKey", (q) =>
        q.eq("organizationId", args.organizationId).eq("configKey", "versionControl"),
      )
      .unique();

    if (config) {
      await ctx.db.patch(config._id, {
        versionPrefix: args.versionPrefix,
        versionStyle: args.versionStyle,
        autoIncrementVersion: args.autoIncrementVersion,
      });
    } else {
      await ctx.db.insert("systemConfig", {
        organizationId: args.organizationId,
        configKey: "versionControl",
        versionPrefix: args.versionPrefix,
        versionStyle: args.versionStyle,
        autoIncrementVersion: args.autoIncrementVersion,
      });
    }

    return true;
  },
});
