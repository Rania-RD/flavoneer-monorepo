import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Compatibility endpoints for clients that predate the removal of the lab
 * samples workspace. The feature has no backing table in the current schema,
 * so returning empty data is safer than exposing unrelated laboratory data.
 *
 * These can be removed after all deployed clients have rolled forward.
 */
export const getReferenceData = query({
  args: {
    language: v.optional(v.union(v.literal("en"), v.literal("ar"))),
    organizationId: v.optional(v.id("organizations")),
  },
  returns: v.object({
    equipment: v.array(v.any()),
    ingredients: v.array(v.any()),
    projects: v.array(v.any()),
  }),
  handler: async () => ({
    equipment: [],
    ingredients: [],
    projects: [],
  }),
});

export const listRecent = query({
  args: {
    organizationId: v.optional(v.id("organizations")),
  },
  returns: v.array(v.any()),
  handler: async () => [],
});
