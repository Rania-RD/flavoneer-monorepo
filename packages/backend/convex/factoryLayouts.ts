import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  factoryLayoutConnectionInputValidator,
  factoryLayoutMachineInputValidator,
  factoryLayoutZoneInputValidator,
} from "./factoryLayoutValidators";
import { requireSuperAdmin, type SuperAdminIdentity } from "./superAdminAccess";
import { requireWorkspaceMember } from "./workspaceAccess";

const MAX_MACHINES = 32;
const MAX_CONNECTIONS = 64;
const MAX_ZONES = 16;

type LayoutCtx = QueryCtx | MutationCtx;

async function loadLayoutDefinition(ctx: LayoutCtx, layoutId: Id<"factoryLayouts">) {
  const [machines, connections, zones] = await Promise.all([
    ctx.db
      .query("factoryLayoutMachines")
      .withIndex("by_layoutId", (q) => q.eq("layoutId", layoutId))
      .take(MAX_MACHINES + 1),
    ctx.db
      .query("factoryLayoutConnections")
      .withIndex("by_layoutId", (q) => q.eq("layoutId", layoutId))
      .take(MAX_CONNECTIONS + 1),
    ctx.db
      .query("factoryLayoutZones")
      .withIndex("by_layoutId", (q) => q.eq("layoutId", layoutId))
      .take(MAX_ZONES + 1),
  ]);

  if (
    machines.length > MAX_MACHINES ||
    connections.length > MAX_CONNECTIONS ||
    zones.length > MAX_ZONES
  ) {
    throw new Error("Factory layout exceeds supported scene limits");
  }

  return {
    machines: machines.sort((a, b) => a.sortOrder - b.sortOrder),
    connections: connections.sort((a, b) => a.sortOrder - b.sortOrder),
    zones: zones.sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

async function writeAuditLog(
  ctx: MutationCtx,
  identity: SuperAdminIdentity,
  organizationId: Id<"organizations">,
  organizationName: string,
  layoutName: string,
) {
  await ctx.db.insert("platformAuditLogs", {
    actorId: identity.authUser._id,
    actorName: identity.user.name ?? identity.user.email ?? "Super admin",
    action: "factory_layout.assigned",
    targetType: "organization",
    targetId: organizationId,
    targetLabel: organizationName,
    summary: `Assigned 3D factory layout: ${layoutName}`,
    createdAt: Date.now(),
  });
}

export const getForOrganization = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.organizationId);
    const layout = await ctx.db
      .query("factoryLayouts")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .unique();
    if (!layout) {
      return null;
    }
    const definition = await loadLayoutDefinition(ctx, layout._id);
    return { ...layout, ...definition };
  },
});

export const getForSuperAdmin = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }
    const layout = await ctx.db
      .query("factoryLayouts")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .unique();
    if (!layout) {
      return { organization, layout: null };
    }
    const definition = await loadLayoutDefinition(ctx, layout._id);
    return { organization, layout: { ...layout, ...definition } };
  },
});

export const saveForOrganization = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    machines: v.array(factoryLayoutMachineInputValidator),
    connections: v.array(factoryLayoutConnectionInputValidator),
    zones: v.array(factoryLayoutZoneInputValidator),
  },
  returns: v.id("factoryLayouts"),
  handler: async (ctx, args) => {
    const identity = await requireSuperAdmin(ctx);
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const name = args.name.trim();
    if (!name) {
      throw new Error("Layout name is required");
    }
    if (
      args.machines.length > MAX_MACHINES ||
      args.connections.length > MAX_CONNECTIONS ||
      args.zones.length > MAX_ZONES
    ) {
      throw new Error("Factory layout exceeds supported scene limits");
    }

    const machineKeys = new Set(args.machines.map((machine) => machine.machineKey));
    if (machineKeys.size !== args.machines.length || machineKeys.has("")) {
      throw new Error("Machine keys must be unique and non-empty");
    }
    const connectionKeys = new Set(
      args.connections.map((connection) => connection.connectionKey),
    );
    if (connectionKeys.size !== args.connections.length || connectionKeys.has("")) {
      throw new Error("Connection keys must be unique and non-empty");
    }
    for (const connection of args.connections) {
      if (
        !machineKeys.has(connection.fromMachineKey) ||
        !machineKeys.has(connection.toMachineKey)
      ) {
        throw new Error("Every connection must reference two machines in the layout");
      }
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("factoryLayouts")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .unique();
    let layoutId: Id<"factoryLayouts">;
    if (existing) {
      layoutId = existing._id;
      await ctx.db.patch(existing._id, {
        name,
        version: existing.version + 1,
        updatedAt: now,
        updatedBy: identity.authUser._id,
      });
      const existingDefinition = await loadLayoutDefinition(ctx, existing._id);
      for (const machine of existingDefinition.machines) await ctx.db.delete(machine._id);
      for (const connection of existingDefinition.connections) {
        await ctx.db.delete(connection._id);
      }
      for (const zone of existingDefinition.zones) await ctx.db.delete(zone._id);
    } else {
      layoutId = await ctx.db.insert("factoryLayouts", {
        organizationId: args.organizationId,
        name,
        version: 1,
        createdAt: now,
        createdBy: identity.authUser._id,
        updatedAt: now,
        updatedBy: identity.authUser._id,
      });
    }

    for (const machine of args.machines) {
      await ctx.db.insert("factoryLayoutMachines", {
        ...machine,
        machineKey: machine.machineKey.trim(),
        label: machine.label.trim(),
        color: machine.color.trim(),
        layoutId,
        organizationId: args.organizationId,
        updatedAt: now,
      });
    }
    for (const connection of args.connections) {
      await ctx.db.insert("factoryLayoutConnections", {
        ...connection,
        connectionKey: connection.connectionKey.trim(),
        color: connection.color.trim(),
        layoutId,
        organizationId: args.organizationId,
        updatedAt: now,
      });
    }
    for (const zone of args.zones) {
      await ctx.db.insert("factoryLayoutZones", {
        ...zone,
        zoneKey: zone.zoneKey.trim(),
        label: zone.label.trim(),
        color: zone.color.trim(),
        layoutId,
        organizationId: args.organizationId,
        updatedAt: now,
      });
    }

    await writeAuditLog(ctx, identity, organization._id, organization.name, name);
    return layoutId;
  },
});
