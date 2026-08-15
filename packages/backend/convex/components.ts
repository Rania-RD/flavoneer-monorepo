import { v } from "convex/values";
import { query } from "./_generated/server";
import { selectLocalizedString } from "./localization";
import { languageValidator } from "./validators";
import { requirePersonalOrWorkspaceScope } from "./workspaceAccess";

const componentOptionValidator = v.object({
  _id: v.id("ingredients"),
  code: v.optional(v.string()),
  commonName: v.optional(v.string()),
  groupId: v.optional(v.string()),
  name: v.string(),
});

/** Reactive, tenant-scoped options from the complete Components Library. */
export const list = query({
  args: {
    language: v.optional(languageValidator),
    organizationId: v.optional(v.id("organizations")),
  },
  returns: v.array(componentOptionValidator),
  handler: async (ctx, args) => {
    const scope = await requirePersonalOrWorkspaceScope(ctx, args.organizationId);
    // The user explicitly needs the complete dropdown dataset. Convex tracks
    // this indexed range reactively, so inserts appear without polling or a
    // manual refresh. The personal scope uses a legacy filter until by_userId
    // finishes its staged index rollout.
    const components = scope.organizationId
      ? await ctx.db
          .query("ingredients")
          .withIndex("by_organizationId", (q) => q.eq("organizationId", scope.organizationId))
          .order("desc")
          .collect()
      : await ctx.db
          .query("ingredients")
          .filter((q) =>
            q.and(
              q.eq(q.field("organizationId"), undefined),
              q.eq(q.field("userId"), scope.userId),
            ),
          )
          .order("desc")
          .collect();

    return components.map((component) => ({
      _id: component._id,
      code: component.code,
      commonName: selectLocalizedString(
        component.commonName,
        component.commonNameI18n,
        args.language,
      ),
      groupId: component.groupId,
      name: selectLocalizedString(component.name, component.nameI18n, args.language),
    }));
  },
});
