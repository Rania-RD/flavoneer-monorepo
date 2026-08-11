import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { logOrganizationAction } from "./organizationAuditLogs";
import { getEffectivePermissions, requirePermission } from "./permissions";
import {
  inviteRoleValidator,
  organizationMemberReturnValidator,
  organizationMemberWithRoleReturnValidator,
} from "./validators";
import { requireWorkspaceAdmin, requireWorkspaceMember } from "./workspaceAccess";

// ─── Queries ──────────────────────────────────────────

/** List all members of an organization (caller must be a member) */
export const list = query({
  args: { organizationId: v.id("organizations") },
  returns: v.array(organizationMemberReturnValidator),
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.organizationId);

    return await ctx.db
      .query("organizationMembers")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .take(100);
  },
});

/** List organization members with their organization-specific system roles. */
export const listWithRoles = query({
  args: { organizationId: v.id("organizations") },
  returns: v.array(organizationMemberWithRoleReturnValidator),
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.organizationId, "manage_roles");
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .take(100);

    return await Promise.all(
      members.map(async (member) => {
        const assignedRole = member.roleId ? await ctx.db.get(member.roleId) : null;
        const roleDetails =
          assignedRole?.organizationId === args.organizationId ? assignedRole : undefined;
        return {
          ...member,
          roleDetails,
          effectivePermissions: getEffectivePermissions(roleDetails),
        };
      }),
    );
  },
});

// ─── Mutations ────────────────────────────────────────

/** Change a member's role (admin+ only; cannot demote owner) */
export const updateRole = mutation({
  args: {
    memberId: v.id("organizationMembers"),
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

    const { authUser, organization } = await requireWorkspaceAdmin(ctx, target.organizationId);

    const oldRole = target.role;
    let authMemberId = target.authMemberId;
    if (organization.authOrganizationId) {
      if (!authMemberId) {
        const authMember = await ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "member",
          where: [
            {
              field: "organizationId",
              value: organization.authOrganizationId,
            },
            { field: "userId", value: target.userId },
          ],
        });
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
          organizationId: organization.authOrganizationId,
        },
        headers,
      });
    }

    await ctx.db.patch(args.memberId, {
      role: args.newRole,
      authMemberId,
    });

    await logOrganizationAction(ctx, {
      organizationId: target.organizationId,
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

/** Assign a system role within one organization. */
export const updateSystemRole = mutation({
  args: {
    organizationId: v.id("organizations"),
    memberId: v.id("organizationMembers"),
    newRoleId: v.id("roles"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.organizationId, "manage_roles");
    const [member, role] = await Promise.all([
      ctx.db.get(args.memberId),
      ctx.db.get(args.newRoleId),
    ]);
    if (!member || member.organizationId !== args.organizationId) {
      throw new Error("Member not found");
    }
    if (!role || role.organizationId !== args.organizationId) {
      throw new Error("Role not found");
    }
    if (member.role === "owner" && role.key !== "admin") {
      throw new Error("Organization owners must retain the Admin role");
    }

    await ctx.db.patch(member._id, { roleId: role._id });
    return null;
  },
});

/** Remove a member from the organization (admin+ only; owner can remove admins) */
export const remove = mutation({
  args: { memberId: v.id("organizationMembers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.memberId);
    if (!target) {
      throw new Error("Member not found");
    }

    // Cannot remove the owner
    if (target.role === "owner") {
      throw new Error("Cannot remove the organization owner");
    }

    const access = await requireWorkspaceAdmin(ctx, target.organizationId);
    if (target.role === "admin" && access.role !== "owner") {
      throw new Error("Only the owner can remove admins");
    }

    if (access.organization.authOrganizationId) {
      const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
      await auth.api.removeMember({
        body: {
          memberIdOrEmail: target.authMemberId ?? target.userEmail,
          organizationId: access.organization.authOrganizationId,
        },
        headers,
      });
    }

    await ctx.db.delete(args.memberId);

    await logOrganizationAction(ctx, {
      organizationId: target.organizationId,
      actorId: access.authUser._id,
      actorName: access.authUser.name ?? access.authUser.email ?? "Unknown",
      action: "member.removed",
      targetType: "member",
      targetId: target.userId,
      targetLabel: target.userName,
    });
    return null;
  },
});

/** Current user leaves the organization (owners cannot leave) */
export const leave = mutation({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const access = await requireWorkspaceMember(ctx, args.organizationId);
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organizationId_and_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", access.authUser._id),
      )
      .unique();
    if (!membership) {
      throw new Error("Not a member of this organization");
    }
    if (membership.role === "owner") {
      throw new Error("Owners must transfer ownership before leaving");
    }

    if (access.organization.authOrganizationId) {
      const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
      await auth.api.leaveOrganization({
        body: { organizationId: access.organization.authOrganizationId },
        headers,
      });
    }

    await ctx.db.delete(membership._id);

    await logOrganizationAction(ctx, {
      organizationId: args.organizationId,
      actorId: access.authUser._id,
      actorName: access.authUser.name ?? access.authUser.email ?? "Unknown",
      action: "member.left",
      targetType: "member",
      targetId: access.authUser._id,
      targetLabel: access.authUser.name ?? access.authUser.email ?? "Unknown",
    });
    return null;
  },
});
