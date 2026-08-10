import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireWorkspaceMember } from "./workspaceAccess";

/** Resolve every active feature flag for a workspace. */
export const listForOrganization = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.organizationId);
    const [flags, overrides] = await Promise.all([
      ctx.db.query("featureFlags").take(100),
      ctx.db
        .query("featureFlagOverrides")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
        .take(100),
    ]);
    const overridesByFlag = new Map(
      overrides.map((override) => [override.featureFlagId, override]),
    );
    return flags
      .filter((flag) => flag.archivedAt === undefined)
      .map((flag) => {
        const override = overridesByFlag.get(flag._id);
        return {
          key: flag.key,
          enabled: override?.enabled ?? flag.enabledByDefault,
          source: override ? ("override" as const) : ("default" as const),
        };
      });
  },
});

/** Resolve one feature flag without sending the whole definition list. */
export const isEnabled = query({
  args: {
    organizationId: v.id("organizations"),
    key: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.organizationId);
    const flag = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (!flag || flag.archivedAt !== undefined) return false;
    const override = await ctx.db
      .query("featureFlagOverrides")
      .withIndex("by_featureFlagId_and_organizationId", (q) =>
        q.eq("featureFlagId", flag._id).eq("organizationId", args.organizationId),
      )
      .unique();
    return override?.enabled ?? flag.enabledByDefault;
  },
});
