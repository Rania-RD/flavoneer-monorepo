import { Migrations } from "@convex-dev/migrations";
import { v } from "convex/values";
import { components } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import { createAuth } from "./auth";
import { DEFAULT_SYSTEM_ROLES } from "./roles";

export const migrations = new Migrations<DataModel>(components.migrations);

/** Backfill the domain-accurate component relation from the legacy ingredient relation. */
export const backfillInventoryComponentId = migrations.define({
  table: "inventoryItems",
  migrateOne: (_ctx, item) => {
    if (item.componentId !== undefined) {
      return;
    }
    if (item.ingredientId === undefined) {
      throw new Error(`Inventory item ${item._id} has no component relation to migrate`);
    }
    return { componentId: item.ingredientId };
  },
});

/**
 * Remove the zero-stock inventory placeholders that were previously generated
 * when a Components Library item was created. Explicitly added stock batches
 * never carry this marker and are left untouched.
 */
export const deleteComponentLibraryInventoryRecords = migrations.define({
  table: "inventoryItems",
  migrateOne: async (ctx, item) => {
    if (item.syncSource !== "component_library") {
      return;
    }

    const usageLog = await ctx.db
      .query("materialUsageLogs")
      .withIndex("by_inventoryItemId", (q) => q.eq("inventoryItemId", item._id))
      .first();
    if (usageLog) {
      throw new Error(
        `Generated inventory item ${item._id} has usage history and must be reviewed manually`,
      );
    }

    await ctx.db.delete(item._id);
  },
});

/** Return any generated inventory placeholders that still need removal. */
export const verifyNoComponentLibraryInventoryRecords = internalQuery({
  args: {},
  returns: v.object({
    complete: v.boolean(),
    remainingIds: v.array(v.id("inventoryItems")),
  }),
  handler: async (ctx) => {
    const remaining = await ctx.db
      .query("inventoryItems")
      .filter((q) => q.eq(q.field("syncSource"), "component_library"))
      .take(100);
    return {
      complete: remaining.length === 0,
      remainingIds: remaining.map((item) => item._id),
    };
  },
});

/** Return a bounded sample of inventory rows still missing the new relation. */
export const verifyInventoryComponentId = internalQuery({
  args: {},
  returns: v.object({
    complete: v.boolean(),
    missingIds: v.array(v.id("inventoryItems")),
  }),
  handler: async (ctx) => {
    const missing = await ctx.db
      .query("inventoryItems")
      .filter((q) => q.eq(q.field("componentId"), undefined))
      .take(100);
    return {
      complete: missing.length === 0,
      missingIds: missing.map((item) => item._id),
    };
  },
});

/**
 * Copy the legacy global role matrix and settings into every organization and
 * move user role assignments onto organization memberships.
 */
export const migrateOrganizationRolesAndConfig = migrations.define({
  table: "organizations",
  batchSize: 1,
  migrateOne: async (ctx, organization) => {
    const legacyRoles = await ctx.db
      .query("roles")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", undefined))
      .take(100);
    const scopedRoleIds = new Map<string, Id<"roles">>();

    for (const defaultRole of DEFAULT_SYSTEM_ROLES) {
      const existing = await ctx.db
        .query("roles")
        .withIndex("by_organizationId_and_key", (q) =>
          q.eq("organizationId", organization._id).eq("key", defaultRole.key),
        )
        .unique();
      if (existing) {
        scopedRoleIds.set(existing.key, existing._id);
        continue;
      }

      const legacyRole = legacyRoles.find((role) => role.key === defaultRole.key);
      const roleId = await ctx.db.insert("roles", {
        organizationId: organization._id,
        key: defaultRole.key,
        name: legacyRole?.name ?? defaultRole.name,
        description: legacyRole?.description ?? defaultRole.description,
        permissions: legacyRole?.permissions ?? [...defaultRole.permissions],
      });
      scopedRoleIds.set(defaultRole.key, roleId);
    }

    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organization._id))
      .take(101);
    if (members.length > 100) {
      throw new Error(`Organization ${organization._id} exceeds the role migration limit`);
    }

    for (const member of members) {
      const assignedRole = member.roleId ? await ctx.db.get(member.roleId) : null;
      if (assignedRole?.organizationId === organization._id) {
        continue;
      }

      const localUser = await ctx.db
        .query("users")
        .withIndex("by_authUserId", (q) => q.eq("authUserId", member.userId))
        .unique();
      const legacyRole = localUser?.roleId ? await ctx.db.get(localUser.roleId) : null;
      const legacyMemberRoleKey =
        legacyRole && legacyRole.organizationId === undefined && legacyRole.key !== "admin"
          ? legacyRole.key
          : "operator";
      const roleKey =
        member.role === "owner" || member.role === "admin" ? "admin" : legacyMemberRoleKey;
      const roleId = scopedRoleIds.get(roleKey) ?? scopedRoleIds.get("operator");
      if (!roleId) {
        throw new Error(`Organization ${organization._id} has no default role for ${roleKey}`);
      }
      await ctx.db.patch(member._id, { roleId });
    }

    const legacyConfigs = await ctx.db
      .query("systemConfig")
      .withIndex("by_organizationId_and_configKey", (q) => q.eq("organizationId", undefined))
      .take(20);
    for (const legacyConfig of legacyConfigs) {
      const existing = await ctx.db
        .query("systemConfig")
        .withIndex("by_organizationId_and_configKey", (q) =>
          q.eq("organizationId", organization._id).eq("configKey", legacyConfig.configKey),
        )
        .unique();
      if (!existing) {
        await ctx.db.insert("systemConfig", {
          organizationId: organization._id,
          configKey: legacyConfig.configKey,
          idPrefix: legacyConfig.idPrefix,
          currentIdNumber: legacyConfig.currentIdNumber,
          versionPrefix: legacyConfig.versionPrefix,
          versionStyle: legacyConfig.versionStyle,
          autoIncrementVersion: legacyConfig.autoIncrementVersion,
        });
      }
    }
  },
});

/** Restore the fixed Admin role for every existing organization owner and admin. */
export const restoreOrganizationAdministratorAccess = migrations.define({
  table: "organizations",
  batchSize: 1,
  migrateOne: async (ctx, organization) => {
    const adminDefaults = DEFAULT_SYSTEM_ROLES.find((role) => role.key === "admin");
    if (!adminDefaults) {
      throw new Error("Admin system role defaults are missing");
    }

    let adminRole = await ctx.db
      .query("roles")
      .withIndex("by_organizationId_and_key", (q) =>
        q.eq("organizationId", organization._id).eq("key", "admin"),
      )
      .unique();
    if (!adminRole) {
      const adminRoleId = await ctx.db.insert("roles", {
        ...adminDefaults,
        organizationId: organization._id,
        permissions: [...adminDefaults.permissions],
      });
      adminRole = await ctx.db.get(adminRoleId);
    } else if (!adminRole.permissions.includes("full_access")) {
      await ctx.db.patch(adminRole._id, {
        permissions: ["full_access", ...adminRole.permissions],
      });
    }

    if (!adminRole) {
      throw new Error(`Organization ${organization._id} has no Admin system role`);
    }

    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organization._id))
      .take(101);
    if (members.length > 100) {
      throw new Error(`Organization ${organization._id} exceeds the administrator repair limit`);
    }

    for (const member of members) {
      const isOrganizationAdministrator =
        member.userId === organization.ownerId ||
        member.role === "owner" ||
        member.role === "admin";
      if (isOrganizationAdministrator && member.roleId !== adminRole._id) {
        await ctx.db.patch(member._id, { roleId: adminRole._id });
      }
    }
  },
});

/** Return bounded samples of organizations and memberships still missing scoped roles. */
export const verifyOrganizationRoles = internalQuery({
  args: {},
  returns: v.object({
    incompleteOrganizationIds: v.array(v.id("organizations")),
    invalidMembershipIds: v.array(v.id("organizationMembers")),
  }),
  handler: async (ctx) => {
    const organizations = await ctx.db.query("organizations").take(101);
    const incompleteOrganizationIds: Id<"organizations">[] = [];
    const invalidMembershipIds: Id<"organizationMembers">[] = [];

    for (const organization of organizations.slice(0, 100)) {
      const roles = await ctx.db
        .query("roles")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organization._id))
        .take(DEFAULT_SYSTEM_ROLES.length + 1);
      if (roles.length < DEFAULT_SYSTEM_ROLES.length) {
        incompleteOrganizationIds.push(organization._id);
      }

      const members = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organization._id))
        .take(100);
      for (const member of members) {
        const role = member.roleId ? await ctx.db.get(member.roleId) : null;
        const requiresAdminRole =
          member.userId === organization.ownerId ||
          member.role === "owner" ||
          member.role === "admin";
        if (
          role?.organizationId !== organization._id ||
          (requiresAdminRole && role.key !== "admin")
        ) {
          invalidMembershipIds.push(member._id);
        }
      }
    }

    return { incompleteOrganizationIds, invalidMembershipIds };
  },
});

export const attachBetterAuthOrganizations = migrations.define({
  table: "organizations",
  batchSize: 1,
  migrateOne: async (ctx, organization) => {
    if (organization.authOrganizationId) {
      return;
    }

    const localMembers = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organization._id))
      .take(101);
    if (localMembers.length > 100) {
      throw new Error(`Organization ${organization._id} exceeds the Better Auth membership limit`);
    }
    const pendingInvites = (
      await ctx.db
        .query("organizationInvites")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organization._id))
        .take(101)
    ).filter((invite) => invite.status === "pending");
    if (pendingInvites.length > 100) {
      throw new Error(`Organization ${organization._id} exceeds the Better Auth invitation limit`);
    }

    const auth = createAuth(ctx);
    const existingOrganization = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "organization",
      where: [{ field: "slug", value: organization.slug }],
    });
    const authOrganization =
      existingOrganization ??
      (await auth.api.createOrganization({
        body: {
          name: organization.name,
          slug: organization.slug,
          userId: organization.ownerId,
          keepCurrentActiveOrganization: true,
        },
      }));

    const authOrganizationId = authOrganization._id ?? authOrganization.id;
    await ctx.db.patch(organization._id, { authOrganizationId });

    for (const localMember of localMembers) {
      const existingMember = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "member",
        where: [
          { field: "organizationId", value: authOrganizationId },
          { field: "userId", value: localMember.userId },
        ],
      });
      const authMember =
        existingMember ??
        (await auth.api.addMember({
          body: {
            userId: localMember.userId,
            role: localMember.role,
            organizationId: authOrganizationId,
          },
        }));

      await ctx.db.patch(localMember._id, {
        authMemberId: authMember._id ?? authMember.id,
      });
    }

    for (const pendingInvite of pendingInvites) {
      if (pendingInvite.authInvitationId) {
        continue;
      }

      const existingInvitation = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "invitation",
        where: [
          { field: "organizationId", value: authOrganizationId },
          { field: "email", value: pendingInvite.email.toLowerCase() },
          { field: "status", value: "pending" },
        ],
      });
      const authInvitation =
        existingInvitation ??
        (await ctx.runMutation(components.betterAuth.adapter.create, {
          input: {
            model: "invitation",
            data: {
              organizationId: authOrganizationId,
              email: pendingInvite.email.toLowerCase(),
              role: pendingInvite.role,
              status: "pending",
              expiresAt: Date.now() + 48 * 60 * 60 * 1000,
              createdAt: Date.now(),
              inviterId: pendingInvite.invitedBy,
            },
          },
        }));
      const authInvitationId = authInvitation._id ?? authInvitation.id;

      await ctx.db.patch(pendingInvite._id, {
        authInvitationId,
        token: authInvitationId,
        createdAt: authInvitation.createdAt,
        expiresAt: authInvitation.expiresAt,
      });
    }
  },
});

type ResourceTenant = {
  organizationId?: Id<"organizations"> | null;
  userId?: string | null;
};

function getTenant(resource: ResourceTenant | null) {
  if (!resource) {
    return null;
  }
  if (resource.organizationId) {
    return {
      organizationId: resource.organizationId,
      userId: resource.userId ?? undefined,
    };
  }
  return resource.userId ? { userId: resource.userId } : null;
}

function tenantsMatch(left: ReturnType<typeof getTenant>, right: ReturnType<typeof getTenant>) {
  if (!(left && right)) {
    return true;
  }
  return (
    left.organizationId === right.organizationId &&
    (!left.organizationId ? left.userId === right.userId : true)
  );
}

/** Backfill inventory ownership from its ingredient or an unambiguous usage-log project. */
export const backfillInventoryTenancy = migrations.define({
  table: "inventoryItems",
  migrateOne: async (ctx, item) => {
    if (getTenant(item)) {
      return;
    }

    const ingredientTenant = getTenant(await ctx.db.get(item.componentId));
    const usageLog = await ctx.db
      .query("materialUsageLogs")
      .withIndex("by_inventoryItemId", (q) => q.eq("inventoryItemId", item._id))
      .first();
    const projectTenant = usageLog ? getTenant(await ctx.db.get(usageLog.projectId)) : null;
    if (!tenantsMatch(ingredientTenant, projectTenant)) {
      return;
    }

    const tenant = ingredientTenant ?? projectTenant;
    return tenant ?? undefined;
  },
});

/** Backfill report ownership only when its project and run scopes agree. */
export const backfillLabReportTenancy = migrations.define({
  table: "labReports",
  migrateOne: async (ctx, report) => {
    if (getTenant(report)) {
      return;
    }

    const projectTenant = getTenant(await ctx.db.get(report.projectId));
    const runTenant = getTenant(await ctx.db.get(report.runId));
    if (!tenantsMatch(projectTenant, runTenant)) {
      return;
    }
    const tenant = projectTenant ?? runTenant;
    return tenant ?? undefined;
  },
});

/**
 * Assign ambiguous legacy rows after an operator has mapped them to a workspace.
 * This is internal and intentionally refuses already-owned rows.
 */
export const assignLegacyResourcesToOrganization = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    equipmentIds: v.optional(v.array(v.id("equipment"))),
    ingredientIds: v.optional(v.array(v.id("ingredients"))),
    inventoryItemIds: v.optional(v.array(v.id("inventoryItems"))),
    labReportIds: v.optional(v.array(v.id("labReports"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }
    const total =
      (args.equipmentIds?.length ?? 0) +
      (args.ingredientIds?.length ?? 0) +
      (args.inventoryItemIds?.length ?? 0) +
      (args.labReportIds?.length ?? 0);
    if (total > 100) {
      throw new Error("Assign at most 100 resources per call");
    }

    for (const id of args.equipmentIds ?? []) {
      const resource = await ctx.db.get(id);
      if (!resource || getTenant(resource)) {
        throw new Error(`Equipment ${id} is missing or already owned`);
      }
      await ctx.db.patch(id, { organizationId: args.organizationId });
    }
    for (const id of args.ingredientIds ?? []) {
      const resource = await ctx.db.get(id);
      if (!resource || getTenant(resource)) {
        throw new Error(`Ingredient ${id} is missing or already owned`);
      }
      await ctx.db.patch(id, { organizationId: args.organizationId });
    }
    for (const id of args.inventoryItemIds ?? []) {
      const resource = await ctx.db.get(id);
      if (!resource || getTenant(resource)) {
        throw new Error(`Inventory item ${id} is missing or already owned`);
      }
      await ctx.db.patch(id, { organizationId: args.organizationId });
    }
    for (const id of args.labReportIds ?? []) {
      const resource = await ctx.db.get(id);
      if (!resource || getTenant(resource)) {
        throw new Error(`Lab report ${id} is missing or already owned`);
      }
      await ctx.db.patch(id, { organizationId: args.organizationId });
    }
    return null;
  },
});

/** Return bounded samples of rows still locked because they have no tenant. */
export const verifyDomainTenancy = internalQuery({
  args: {},
  returns: v.object({
    equipmentIds: v.array(v.id("equipment")),
    ingredientIds: v.array(v.id("ingredients")),
    inventoryItemIds: v.array(v.id("inventoryItems")),
    labReportIds: v.array(v.id("labReports")),
  }),
  handler: async (ctx) => {
    const [equipment, ingredients, inventoryItems, labReports] = await Promise.all([
      ctx.db
        .query("equipment")
        .filter((q) =>
          q.and(q.eq(q.field("organizationId"), undefined), q.eq(q.field("userId"), undefined)),
        )
        .take(100),
      ctx.db
        .query("ingredients")
        .filter((q) =>
          q.and(q.eq(q.field("organizationId"), undefined), q.eq(q.field("userId"), undefined)),
        )
        .take(100),
      ctx.db
        .query("inventoryItems")
        .filter((q) =>
          q.and(q.eq(q.field("organizationId"), undefined), q.eq(q.field("userId"), undefined)),
        )
        .take(100),
      ctx.db
        .query("labReports")
        .filter((q) =>
          q.and(q.eq(q.field("organizationId"), undefined), q.eq(q.field("userId"), undefined)),
        )
        .take(100),
    ]);
    return {
      equipmentIds: equipment.map((item) => item._id),
      ingredientIds: ingredients.map((item) => item._id),
      inventoryItemIds: inventoryItems.map((item) => item._id),
      labReportIds: labReports.map((item) => item._id),
    };
  },
});

export const run = migrations.runner();
