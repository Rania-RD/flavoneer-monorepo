import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePersonalOrWorkspaceAccess } from "./workspaceAccess";

function getDisplayName(user: { name?: string | null; email?: string | null }) {
  return user.name?.trim() || user.email?.trim() || "Unknown user";
}

// ─── List Comments for a Project (Optionally filtered by phase) ───
export const list = query({
  args: {
    projectId: v.id("projects"),
    phaseId: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("comments"),
      _creationTime: v.number(),
      projectId: v.id("projects"),
      phaseId: v.optional(v.string()),
      text: v.string(),
      authorName: v.string(),
      authorId: v.optional(v.string()),
      createdAt: v.number(),
      isResolved: v.boolean(),
      resolvedBy: v.optional(v.string()),
      resolvedById: v.optional(v.string()),
      resolvedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    await requirePersonalOrWorkspaceAccess(ctx, project);

    const q = ctx.db
      .query("comments")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId));

    let comments = await q.collect();

    if (args.phaseId !== undefined) {
      comments = comments.filter((c) => c.phaseId === args.phaseId);
    }

    return comments.sort((a, b) => a.createdAt - b.createdAt);
  },
});

// ─── Add a Comment ────────────────────────────────────────────────
export const add = mutation({
  args: {
    projectId: v.id("projects"),
    phaseId: v.optional(v.string()),
    text: v.string(),
  },
  returns: v.id("comments"),
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    const authUser = await requirePersonalOrWorkspaceAccess(ctx, project);
    return await ctx.db.insert("comments", {
      projectId: args.projectId,
      phaseId: args.phaseId,
      text: args.text,
      authorName: getDisplayName(authUser),
      authorId: authUser._id,
      createdAt: Date.now(),
      isResolved: false,
    });
  },
});

// ─── Resolve a Comment ────────────────────────────────────────────
export const resolve = mutation({
  args: {
    commentId: v.id("comments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }
    const project = await ctx.db.get(comment.projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    const authUser = await requirePersonalOrWorkspaceAccess(ctx, project);
    await ctx.db.patch(args.commentId, {
      isResolved: true,
      resolvedBy: getDisplayName(authUser),
      resolvedById: authUser._id,
      resolvedAt: Date.now(),
    });
    return null;
  },
});
