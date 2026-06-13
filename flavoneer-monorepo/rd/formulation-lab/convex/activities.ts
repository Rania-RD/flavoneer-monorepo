import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { activityReturnValidator } from "./validators";

// ── Log an activity for the current user ──
export const log = mutation({
  args: {
    action: v.string(),
    target: v.string(),
    page: v.string(),
  },
  returns: v.union(v.id("activities"), v.null()),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    return await ctx.db.insert("activities", {
      userId: authUser._id,
      action: args.action,
      target: args.target,
      page: args.page,
      createdAt: Date.now(),
    });
  },
});

// ── Fetch the latest 10 activities for the current user ──
export const listForUser = query({
  args: {},
  returns: v.array(activityReturnValidator),
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      return [];
    }

    const all = await ctx.db
      .query("activities")
      .withIndex("by_userId", (q) => q.eq("userId", authUser._id))
      .order("desc")
      .take(10);

    return all;
  },
});
