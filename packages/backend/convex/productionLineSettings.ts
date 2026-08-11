import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePermission } from "./permissions";
import { productionHallCodeValidator } from "./validators";
import { requireWorkspaceAdmin, requireWorkspaceMember } from "./workspaceAccess";

const counterSummaryValidator = v.object({
  hallCode: productionHallCodeValidator,
  lastAllocatedAt: v.optional(v.number()),
  lastAllocatedSequence: v.optional(v.number()),
  nextSequence: v.number(),
});

const settingsSummaryValidator = v.object({
  enabledHallCodes: v.array(productionHallCodeValidator),
  hallCounters: v.array(counterSummaryValidator),
  timezone: v.string(),
});

function assertValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
  } catch {
    throw new Error("Timezone must be a valid IANA timezone");
  }
}

export const get = query({
  args: { organizationId: v.id("organizations") },
  returns: v.union(settingsSummaryValidator, v.null()),
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.organizationId);
    const settings = await ctx.db
      .query("productionLineSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .unique();
    if (!settings) {
      return null;
    }

    const hallCounters = await Promise.all(
      settings.enabledHallCodes.map(async (hallCode) => {
        const counter = await ctx.db
          .query("productionLineSerialCounters")
          .withIndex("by_organizationId_and_hallCode", (q) =>
            q.eq("organizationId", args.organizationId).eq("hallCode", hallCode),
          )
          .unique();
        return {
          hallCode,
          nextSequence: counter?.nextSequence ?? 0,
          lastAllocatedSequence: counter ? counter.nextSequence - 1 : undefined,
          lastAllocatedAt: counter?.lastAllocatedAt,
        };
      }),
    );

    return {
      timezone: settings.timezone,
      enabledHallCodes: settings.enabledHallCodes,
      hallCounters,
    };
  },
});

export const upsert = mutation({
  args: {
    organizationId: v.id("organizations"),
    timezone: v.string(),
    enabledHallCodes: v.array(productionHallCodeValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { authUser } = await requireWorkspaceAdmin(ctx, args.organizationId);
    await requirePermission(ctx, args.organizationId, "manage_production_line_settings");
    assertValidTimezone(args.timezone);
    const enabledHallCodes = [...new Set(args.enabledHallCodes)];
    if (enabledHallCodes.length === 0) {
      throw new Error("At least one production hall must be enabled");
    }

    const existing = await ctx.db
      .query("productionLineSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .unique();
    const patch = {
      timezone: args.timezone,
      enabledHallCodes,
      updatedAt: Date.now(),
      updatedBy: authUser._id,
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("productionLineSettings", {
        organizationId: args.organizationId,
        ...patch,
      });
    }
    return null;
  },
});

export const initializeHallSerial = mutation({
  args: {
    organizationId: v.id("organizations"),
    hallCode: productionHallCodeValidator,
    nextSequence: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { authUser } = await requireWorkspaceAdmin(ctx, args.organizationId);
    await requirePermission(ctx, args.organizationId, "manage_production_line_settings");
    if (!Number.isSafeInteger(args.nextSequence) || args.nextSequence < 1) {
      throw new Error("Next serial sequence must be a positive integer");
    }

    const settings = await ctx.db
      .query("productionLineSettings")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .unique();
    if (!settings?.enabledHallCodes.includes(args.hallCode)) {
      throw new Error("Production hall must be enabled before seeding its counter");
    }

    const existing = await ctx.db
      .query("productionLineSerialCounters")
      .withIndex("by_organizationId_and_hallCode", (q) =>
        q.eq("organizationId", args.organizationId).eq("hallCode", args.hallCode),
      )
      .unique();
    if (existing) {
      throw new Error("This production hall serial counter is already initialized");
    }

    await ctx.db.insert("productionLineSerialCounters", {
      organizationId: args.organizationId,
      hallCode: args.hallCode,
      nextSequence: args.nextSequence,
      initializedAt: Date.now(),
      initializedBy: authUser._id,
    });
    return null;
  },
});
