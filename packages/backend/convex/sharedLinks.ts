import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation } from "./_generated/server";
import { getActiveSharedAccess } from "./sharedAccess";
import { sharedEntityTypeValidator, sharedRoleValidator } from "./validators";
import { getAuthUserOrThrow, requireOwnerOrWorkspaceAccess } from "./workspaceAccess";

const SHARE_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const sharedEntityIdValidator = v.union(v.id("projects"), v.id("runs"));

export const expireLink = internalMutation({
  args: { linkId: v.id("sharedLinks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    const now = Date.now();
    if (link?.isActive && link.expiresAt !== undefined && link.expiresAt <= now) {
      await ctx.db.patch(args.linkId, { isActive: false, expiredAt: now });
    }
    return null;
  },
});

/**
 * Creates a new shared link for a given entity.
 */
export const createLink = mutation({
  args: {
    entityId: sharedEntityIdValidator,
    entityType: sharedEntityTypeValidator,
    role: sharedRoleValidator,
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const entityId = ctx.db.normalizeId(
      args.entityType === "project" ? "projects" : "runs",
      args.entityId,
    );
    if (!entityId || entityId !== args.entityId) {
      throw new Error("Invalid entity ID");
    }
    const entity = await ctx.db.get(entityId);
    if (!entity) {
      throw new Error("Entity not found");
    }
    const authUser = await requireOwnerOrWorkspaceAccess(ctx, entity);

    const now = Date.now();
    const expiresAt = now + SHARE_LINK_TTL_MS;
    const token = crypto.randomUUID();

    const linkId = await ctx.db.insert("sharedLinks", {
      entityId,
      entityType: args.entityType,
      token,
      role: args.role,
      createdBy: authUser._id,
      createdAt: now,
      expiresAt,
      isActive: true,
    });
    await ctx.scheduler.runAt(expiresAt, internal.sharedLinks.expireLink, { linkId });

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
      entityId: sharedEntityIdValidator,
      entityType: sharedEntityTypeValidator,
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const authUser = await getAuthUserOrThrow(ctx);

    const link = await ctx.db
      .query("sharedLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    const now = Date.now();
    if (
      !link?.isActive ||
      link.revokedAt !== undefined ||
      link.expiredAt !== undefined ||
      link.expiresAt === undefined ||
      link.expiresAt <= now
    ) {
      throw new Error("Invalid or expired link");
    }

    const entityId = ctx.db.normalizeId(
      link.entityType === "project" ? "projects" : "runs",
      link.entityId,
    );
    if (!entityId || !(await ctx.db.get(entityId))) {
      throw new Error("Shared entity no longer exists");
    }

    // Check if access already granted
    const existingAccess = await ctx.db
      .query("sharedAccess")
      .withIndex("by_userId_entityId", (q) =>
        q.eq("userId", authUser._id).eq("entityId", link.entityId),
      )
      .first();

    const activeExistingAccess = await getActiveSharedAccess(ctx, authUser._id, entityId, now);
    const shouldReplaceAccess =
      !activeExistingAccess ||
      (activeExistingAccess.role === "viewer" && link.role === "editor") ||
      (activeExistingAccess.role === link.role &&
        (activeExistingAccess.expiresAt ?? 0) < link.expiresAt);

    if (!existingAccess) {
      await ctx.db.insert("sharedAccess", {
        userId: authUser._id,
        entityId,
        entityType: link.entityType,
        role: link.role,
        grantedAt: now,
        sourceLinkId: link._id,
        expiresAt: link.expiresAt,
      });
    } else if (shouldReplaceAccess) {
      await ctx.db.patch(existingAccess._id, {
        role: link.role,
        grantedAt: now,
        sourceLinkId: link._id,
        expiresAt: link.expiresAt,
      });
    }

    return {
      entityId,
      entityType: link.entityType,
    };
  },
});

/** Revoke a link and every access grant that depends on it. */
export const revokeLink = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authUser = await getAuthUserOrThrow(ctx);
    const link = await ctx.db
      .query("sharedLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!link) {
      throw new Error("Shared link not found");
    }

    const entityId = ctx.db.normalizeId(
      link.entityType === "project" ? "projects" : "runs",
      link.entityId,
    );
    const entity = entityId ? await ctx.db.get(entityId) : null;
    if (!entity) {
      throw new Error("Shared entity no longer exists");
    }
    await requireOwnerOrWorkspaceAccess(ctx, entity);

    if (link.revokedAt === undefined) {
      await ctx.db.patch(link._id, {
        isActive: false,
        revokedAt: Date.now(),
        revokedBy: authUser._id,
      });
    }
    return null;
  },
});
