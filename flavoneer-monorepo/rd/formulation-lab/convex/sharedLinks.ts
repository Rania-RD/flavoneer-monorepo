import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { sharedEntityTypeValidator, sharedRoleValidator } from "./validators";

/**
 * Creates a new shared link for a given entity.
 */
export const createLink = mutation({
  args: {
    entityId: v.string(),
    entityType: sharedEntityTypeValidator,
    role: sharedRoleValidator,
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Basic auth check. Real implementation would check if user has rights
    // to share this specific entity (e.g. is project owner/lead).
    const authUserId = (await ctx.auth.getUserIdentity())?.subject;
    if (!authUserId) {
      throw new Error("Unauthorized");
    }

    // Generate a secure crypto token
    const token = crypto.randomUUID();

    await ctx.db.insert("sharedLinks", {
      entityId: args.entityId,
      entityType: args.entityType,
      token,
      role: args.role,
      createdBy: authUserId,
      createdAt: Date.now(),
      isActive: true,
    });

    return token;
  },
});

/**
 * Redeems a share link token for the currently authenticated user.
 * Returns the entityId and entityType to redirect the user.
 */
export const redeemLink = mutation({
  args: { token: v.string() },
  returns: v.union(
    v.object({
      entityId: v.string(),
      entityType: sharedEntityTypeValidator,
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const authUserId = (await ctx.auth.getUserIdentity())?.subject;
    if (!authUserId) {
      throw new Error("Must be logged in to redeem a link");
    }

    const link = await ctx.db
      .query("sharedLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!(link && link.isActive)) {
      throw new Error("Invalid or expired link");
    }

    // Check if access already granted
    const existingAccess = await ctx.db
      .query("sharedAccess")
      .withIndex("by_userId_entityId", (q) =>
        q.eq("userId", authUserId).eq("entityId", link.entityId)
      )
      .first();

    if (!existingAccess) {
      // Grant access
      await ctx.db.insert("sharedAccess", {
        userId: authUserId,
        entityId: link.entityId,
        entityType: link.entityType,
        role: link.role,
        grantedAt: Date.now(),
      });
    } else if (
      // Upgrade role from viewer to editor if new link provides higher access
      existingAccess.role === "viewer" &&
      link.role === "editor"
    ) {
      await ctx.db.patch(existingAccess._id, { role: "editor" });
    }

    return {
      entityId: link.entityId,
      entityType: link.entityType,
    };
  },
});
