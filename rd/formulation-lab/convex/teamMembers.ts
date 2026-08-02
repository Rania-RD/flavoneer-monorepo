import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { logTeamAction } from "./teamAuditLogs";
import { inviteRoleValidator, teamMemberReturnValidator } from "./validators";
import {
  requireWorkspaceAdmin,
  requireWorkspaceMember,
} from "./workspaceAccess";

// ─── Queries ──────────────────────────────────────────

/** List all members of a team (caller must be a member) */
export const list = query({
  args: { teamId: v.id("teams") },
  returns: v.array(teamMemberReturnValidator),
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.teamId);

    return await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .take(100);
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
    const target = await ctx.db.get(args.memberId);
    if (!target) {
      throw new Error("Member not found");
    }

    // Cannot change the owner's role
    if (target.role === "owner") {
      throw new Error("Cannot change the owner's role");
    }

    const { authUser, team } = await requireWorkspaceAdmin(ctx, target.teamId);

    const oldRole = target.role;
    let authMemberId = target.authMemberId;
    if (team.authOrganizationId) {
      if (!authMemberId) {
        const authMember = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: "member",
            where: [
              {
                field: "organizationId",
                value: team.authOrganizationId,
              },
              { field: "userId", value: target.userId },
            ],
          }
        );
        authMemberId = authMember?._id;
      }
      if (!authMemberId) {
        throw new Error("Better Auth member not found");
      }
      const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
      await auth.api.updateMemberRole({
        body: {
          memberId: authMemberId,
          role: args.newRole,
          organizationId: team.authOrganizationId,
        },
        headers,
      });
    }

    await ctx.db.patch(args.memberId, {
      role: args.newRole,
      authMemberId,
    });

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
    const target = await ctx.db.get(args.memberId);
    if (!target) {
      throw new Error("Member not found");
    }

    // Cannot remove the owner
    if (target.role === "owner") {
      throw new Error("Cannot remove the team owner");
    }

    const access = await requireWorkspaceAdmin(ctx, target.teamId);
    if (target.role === "admin" && access.role !== "owner") {
      throw new Error("Only the owner can remove admins");
    }

    if (access.team.authOrganizationId) {
      const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
      await auth.api.removeMember({
        body: {
          memberIdOrEmail: target.authMemberId ?? target.userEmail,
          organizationId: access.team.authOrganizationId,
        },
        headers,
      });
    }

    await ctx.db.delete(args.memberId);

    await logTeamAction(ctx, {
      teamId: target.teamId,
      actorId: access.authUser._id,
      actorName:
        access.authUser.name ?? access.authUser.email ?? "Unknown",
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
    const access = await requireWorkspaceMember(ctx, args.teamId);
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_userId", (q) =>
        q.eq("teamId", args.teamId).eq("userId", access.authUser._id)
      )
      .unique();
    if (!membership) {
      throw new Error("Not a member of this team");
    }
    if (membership.role === "owner") {
      throw new Error("Owners must transfer ownership before leaving");
    }

    if (access.team.authOrganizationId) {
      const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
      await auth.api.leaveOrganization({
        body: { organizationId: access.team.authOrganizationId },
        headers,
      });
    }

    await ctx.db.delete(membership._id);

    await logTeamAction(ctx, {
      teamId: args.teamId,
      actorId: access.authUser._id,
      actorName:
        access.authUser.name ?? access.authUser.email ?? "Unknown",
      action: "member.left",
      targetType: "member",
      targetId: access.authUser._id,
      targetLabel:
        access.authUser.name ?? access.authUser.email ?? "Unknown",
    });
    return null;
  },
});
