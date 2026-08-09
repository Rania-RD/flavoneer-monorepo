import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  getSuperAdminIdentity,
  requireSuperAdmin,
  type SuperAdminIdentity,
} from "./superAdminAccess";
import { organizationStatusValidator } from "./validators";

const MAX_ORGANIZATIONS = 100;
const MAX_FLAGS = 100;
const MAX_OVERRIDES = 2_000;

function normalizeFlagKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function writeAuditLog(
  ctx: MutationCtx,
  identity: SuperAdminIdentity,
  event: {
    action: string;
    targetType: string;
    targetId: string;
    targetLabel: string;
    summary: string;
  },
) {
  await ctx.db.insert("platformAuditLogs", {
    ...event,
    actorId: identity.authUser._id,
    actorName: identity.user.name ?? identity.user.email ?? "Super admin",
    createdAt: Date.now(),
  });
}

export const getAccess = query({
  args: {},
  returns: v.object({ isSuperAdmin: v.boolean() }),
  handler: async (ctx) => ({ isSuperAdmin: (await getSuperAdminIdentity(ctx)) !== null }),
});

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);

    const [organizations, featureFlags, overrides, auditLogs] = await Promise.all([
      ctx.db.query("organizations").order("desc").take(MAX_ORGANIZATIONS),
      ctx.db.query("featureFlags").order("desc").take(MAX_FLAGS),
      ctx.db.query("featureFlagOverrides").take(MAX_OVERRIDES),
      ctx.db.query("platformAuditLogs").withIndex("by_createdAt").order("desc").take(20),
    ]);

    const overrideCountByOrganization = new Map<Id<"organizations">, number>();
    const overrideCountByFlag = new Map<Id<"featureFlags">, number>();
    for (const override of overrides) {
      overrideCountByOrganization.set(
        override.organizationId,
        (overrideCountByOrganization.get(override.organizationId) ?? 0) + 1,
      );
      overrideCountByFlag.set(
        override.featureFlagId,
        (overrideCountByFlag.get(override.featureFlagId) ?? 0) + 1,
      );
    }

    const organizationRows = await Promise.all(
      organizations.map(async (organization) => {
        const [members, projects, lastActivity] = await Promise.all([
          ctx.db
            .query("organizationMembers")
            .withIndex("by_organizationId", (q) => q.eq("organizationId", organization._id))
            .take(501),
          ctx.db
            .query("projects")
            .withIndex("by_organizationId", (q) => q.eq("organizationId", organization._id))
            .take(501),
          ctx.db
            .query("organizationAuditLogs")
            .withIndex("by_organizationId", (q) => q.eq("organizationId", organization._id))
            .order("desc")
            .first(),
        ]);
        const owner = members.find((member) => member.role === "owner");
        return {
          ...organization,
          status: organization.status ?? ("active" as const),
          memberCount: members.length,
          projectCount: projects.length,
          overrideCount: overrideCountByOrganization.get(organization._id) ?? 0,
          ownerName: owner?.userName ?? "",
          ownerEmail: owner?.userEmail ?? "",
          lastActivityAt: lastActivity?.createdAt ?? organization.createdAt,
        };
      }),
    );

    const flagRows = featureFlags.map((flag) => ({
      ...flag,
      overrideCount: overrideCountByFlag.get(flag._id) ?? 0,
    }));

    return {
      organizations: organizationRows,
      featureFlags: flagRows,
      overrides,
      auditLogs,
      totals: {
        organizations: organizationRows.length,
        activeOrganizations: organizationRows.filter(
          (organization) => organization.status === "active",
        ).length,
        members: organizationRows.reduce(
          (total, organization) => total + organization.memberCount,
          0,
        ),
        activeFlags: flagRows.filter((flag) => flag.archivedAt === undefined).length,
      },
      limits: {
        organizationsReached: organizations.length === MAX_ORGANIZATIONS,
        flagsReached: featureFlags.length === MAX_FLAGS,
        overridesReached: overrides.length === MAX_OVERRIDES,
      },
    };
  },
});

export const updateOrganizationStatus = mutation({
  args: {
    organizationId: v.id("organizations"),
    status: organizationStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireSuperAdmin(ctx);
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }
    const currentStatus = organization.status ?? "active";
    if (currentStatus === args.status) {
      return null;
    }
    await ctx.db.patch(organization._id, { status: args.status });
    await writeAuditLog(ctx, identity, {
      action: `organization.${args.status}`,
      targetType: "organization",
      targetId: organization._id,
      targetLabel: organization.name,
      summary: `${currentStatus} → ${args.status}`,
    });
    return null;
  },
});

export const createFeatureFlag = mutation({
  args: {
    key: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.string(),
    enabledByDefault: v.boolean(),
  },
  returns: v.id("featureFlags"),
  handler: async (ctx, args) => {
    const identity = await requireSuperAdmin(ctx);
    const key = normalizeFlagKey(args.key);
    const name = args.name.trim();
    const category = args.category.trim();
    if (!(key && name && category)) {
      throw new Error("Flag key, name, and category are required");
    }
    const existing = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (existing) {
      throw new Error("A feature flag with this key already exists");
    }
    const now = Date.now();
    const flagId = await ctx.db.insert("featureFlags", {
      key,
      name,
      description: args.description.trim(),
      category,
      enabledByDefault: args.enabledByDefault,
      createdAt: now,
      updatedAt: now,
      updatedBy: identity.authUser._id,
    });
    await writeAuditLog(ctx, identity, {
      action: "feature_flag.created",
      targetType: "feature_flag",
      targetId: flagId,
      targetLabel: name,
      summary: args.enabledByDefault ? "Default on" : "Default off",
    });
    return flagId;
  },
});

export const updateFeatureFlag = mutation({
  args: {
    featureFlagId: v.id("featureFlags"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    enabledByDefault: v.optional(v.boolean()),
    archived: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireSuperAdmin(ctx);
    const flag = await ctx.db.get(args.featureFlagId);
    if (!flag) {
      throw new Error("Feature flag not found");
    }
    const now = Date.now();
    const updates: Partial<Doc<"featureFlags">> = {
      updatedAt: now,
      updatedBy: identity.authUser._id,
    };
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new Error("Flag name is required");
      updates.name = name;
    }
    if (args.description !== undefined) updates.description = args.description.trim();
    if (args.category !== undefined) {
      const category = args.category.trim();
      if (!category) {
        throw new Error("Flag category is required");
      }
      updates.category = category;
    }
    if (args.enabledByDefault !== undefined) updates.enabledByDefault = args.enabledByDefault;
    if (args.archived !== undefined) updates.archivedAt = args.archived ? now : undefined;
    await ctx.db.patch(flag._id, updates);
    await writeAuditLog(ctx, identity, {
      action: args.archived === true ? "feature_flag.archived" : "feature_flag.updated",
      targetType: "feature_flag",
      targetId: flag._id,
      targetLabel: updates.name ?? flag.name,
      summary:
        args.enabledByDefault === undefined
          ? "Definition updated"
          : args.enabledByDefault
            ? "Default on"
            : "Default off",
    });
    return null;
  },
});

export const setFeatureFlagOverride = mutation({
  args: {
    featureFlagId: v.id("featureFlags"),
    organizationId: v.id("organizations"),
    enabled: v.union(v.boolean(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireSuperAdmin(ctx);
    const [flag, organization, existing] = await Promise.all([
      ctx.db.get(args.featureFlagId),
      ctx.db.get(args.organizationId),
      ctx.db
        .query("featureFlagOverrides")
        .withIndex("by_featureFlagId_and_organizationId", (q) =>
          q.eq("featureFlagId", args.featureFlagId).eq("organizationId", args.organizationId),
        )
        .unique(),
    ]);
    if (!(flag && organization)) {
      throw new Error("Feature flag or organization not found");
    }
    if (args.enabled === null) {
      if (existing) await ctx.db.delete(existing._id);
    } else if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        updatedAt: Date.now(),
        updatedBy: identity.authUser._id,
      });
    } else {
      await ctx.db.insert("featureFlagOverrides", {
        featureFlagId: flag._id,
        organizationId: organization._id,
        enabled: args.enabled,
        updatedAt: Date.now(),
        updatedBy: identity.authUser._id,
      });
    }
    await writeAuditLog(ctx, identity, {
      action: "feature_flag.override_updated",
      targetType: "organization",
      targetId: organization._id,
      targetLabel: organization.name,
      summary: `${flag.key}: ${args.enabled === null ? "inherit default" : args.enabled ? "on" : "off"}`,
    });
    return null;
  },
});
