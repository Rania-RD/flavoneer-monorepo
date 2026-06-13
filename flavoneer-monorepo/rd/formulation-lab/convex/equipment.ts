import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  equipmentReturnValidator,
  equipmentStatusValidator,
} from "./validators";

export const list = query({
  args: {},
  returns: v.array(equipmentReturnValidator),
  handler: async (ctx) => {
    return await ctx.db.query("equipment").collect();
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("equipment"),
    status: equipmentStatusValidator,
    user: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: { status: typeof args.status; user?: string } = {
      status: args.status,
    };
    if (args.user !== undefined) {
      updates.user = args.user;
    }
    await ctx.db.patch(args.id, updates);
    return null;
  },
});
