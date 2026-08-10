import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { equipmentReturnValidator, equipmentStatusValidator } from "./validators";
import {
  requirePersonalOrWorkspaceAccess,
  requirePersonalOrWorkspaceScope,
} from "./workspaceAccess";

export const list = query({
  args: { organizationId: v.optional(v.id("organizations")) },
  returns: v.array(equipmentReturnValidator),
  handler: async (ctx, args) => {
    const scope = await requirePersonalOrWorkspaceScope(ctx, args.organizationId);
    return await ctx.db
      .query("equipment")
      .filter((q) =>
        scope.organizationId
          ? q.eq(q.field("organizationId"), scope.organizationId)
          : q.and(
              q.eq(q.field("organizationId"), undefined),
              q.eq(q.field("userId"), scope.userId),
            ),
      )
      .collect();
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("equipment"),
    status: equipmentStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const equipment = await ctx.db.get(args.id);
    if (!equipment) {
      throw new Error("Equipment not found");
    }
    const authUser = await requirePersonalOrWorkspaceAccess(ctx, equipment);
    const updates = {
      status: args.status,
      user: authUser.name?.trim() || authUser.email?.trim() || "Unknown user",
      statusUpdatedBy: authUser._id,
      statusUpdatedAt: Date.now(),
    };
    await ctx.db.patch(args.id, updates);
    return null;
  },
});
