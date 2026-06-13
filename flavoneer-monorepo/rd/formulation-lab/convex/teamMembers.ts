import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { logTeamAction } from "./teamAuditLogs";
import { inviteRoleValidator, teamMemberReturnValidator } from "./validators";

// ─── Queries ──────────────────────────────────────────

/** List all members of a team (caller must be a member) */
export const list = query({
  args: { teamId: v.id("teams") },
  returns: v.array(teamMemberReturnValidator),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    // Verify membership
    const callerMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_userId", (q) =>
        q.eq("teamId", args.teamId).eq("userId", authUser._id)
      )
      .first();
    if (!callerMembership) {
      return [];
    }

    return await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

// ─── Mutations ────────────────────────────────────────

/** Change a member's role (admin+ only; cannot demote owner) */
export const updateRole = mutation({
  args: {
    memberId: v.id("teamMembers"),
    newRole: inviteRoleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    const target = await ctx.db.get(args.memberId);
    if (!target) {
      throw new Error("Member not found");
    }

    // Cannot change the owner's role
    if (target.role === "owner") {
      throw new Error("Cannot change the owner's role");
    }

    // Caller must be admin or owner of the same team
    const callerMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_userId", (q) =>
        q.eq("teamId", target.teamId).eq("userId", authUser._id)
      )
      .first();
    if (!callerMembership || callerMembership.role === "member") {
      throw new Error("Insufficient permissions");
    }

    const oldRole = target.role;
    await ctx.db.patch(args.memberId, { role: args.newRole });

    await logTeamAction(ctx, {
      teamId: target.teamId,
      actorId: authUser._id,
      actorName: authUser.name ?? authUser.email ?? "Unknown",
      action: "member.role_changed",
      targetType: "member",
      targetId: target.userId,
      targetLabel: target.userName,
      meta: { oldRole, newRole: args.newRole },
    });
    return null;
  },
});

/** Remove a member from the team (admin+ only; owner can remove admins) */
export const remove = mutation({
  args: { memberId: v.id("teamMembers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    const target = await ctx.db.get(args.memberId);
    if (!target) {
      throw new Error("Member not found");
    }

    // Cannot remove the owner
    if (target.role === "owner") {
      throw new Error("Cannot remove the team owner");
    }

    // Caller must be admin or owner
    const callerMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_userId", (q) =>
        q.eq("teamId", target.teamId).eq("userId", authUser._id)
      )
      .first();
    if (!callerMembership || callerMembership.role === "member") {
      throw new Error("Insufficient permissions");
    }
    // Only owner can remove admins
    if (target.role === "admin" && callerMembership.role !== "owner") {
      throw new Error("Only the owner can remove admins");
    }

    await ctx.db.delete(args.memberId);

    await logTeamAction(ctx, {
      teamId: target.teamId,
      actorId: authUser._id,
      actorName: authUser.name ?? authUser.email ?? "Unknown",
      action: "member.removed",
      targetType: "member",
      targetId: target.userId,
      targetLabel: target.userName,
    });
    return null;
  },
});

/** Current user leaves the team (owners cannot leave) */
export const leave = mutation({
  args: { teamId: v.id("teams") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_userId", (q) =>
        q.eq("teamId", args.teamId).eq("userId", authUser._id)
      )
      .first();
    if (!membership) {
      throw new Error("Not a member of this team");
    }
    if (membership.role === "owner") {
      throw new Error("Owners must transfer ownership before leaving");
    }

    await ctx.db.delete(membership._id);

    await logTeamAction(ctx, {
      teamId: args.teamId,
      actorId: authUser._id,
      actorName: authUser.name ?? authUser.email ?? "Unknown",
      action: "member.left",
      targetType: "member",
      targetId: authUser._id,
      targetLabel: authUser.name ?? authUser.email ?? "Unknown",
    });
    return null;
  },
});
