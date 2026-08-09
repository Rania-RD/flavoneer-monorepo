import { Migrations } from "@convex-dev/migrations";
import { v } from "convex/values";
import { components } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import { createAuth } from "./auth";

export const migrations = new Migrations<DataModel>(components.migrations);

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

    const ingredientTenant = getTenant(await ctx.db.get(item.ingredientId));
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
