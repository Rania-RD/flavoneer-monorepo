import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { logTeamAction } from "./teamAuditLogs";
import { inviteRoleValidator, teamInviteReturnValidator } from "./validators";
import {
  getAuthUserOrThrow,
  requireWorkspaceAdmin,
} from "./workspaceAccess";

const createdInviteValidator = v.object({
  inviteId: v.id("teamInvites"),
  token: v.string(),
});

export const listByTeam = query({
  args: { teamId: v.id("teams") },
  returns: v.array(teamInviteReturnValidator),
  handler: async (ctx, args) => {
    await requireWorkspaceAdmin(ctx, args.teamId);
    return await ctx.db
      .query("teamInvites")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .take(100);
  },
});

export const prepareCreate = internalQuery({
  args: {
    teamId: v.id("teams"),
    email: v.string(),
    role: inviteRoleValidator,
  },
  returns: v.object({
    teamId: v.id("teams"),
    authOrganizationId: v.string(),
    email: v.string(),
    role: inviteRoleValidator,
    actorId: v.string(),
    actorName: v.string(),
  }),
  handler: async (ctx, args) => {
    const access = await requireWorkspaceAdmin(ctx, args.teamId);
    if (!access.team.authOrganizationId) {
      throw new Error("Team must be migrated before inviting members");
    }

    const email = args.email.trim().toLowerCase();
    const existingInvites = await ctx.db
      .query("teamInvites")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .take(100);
    if (
      existingInvites.some(
        (invite) =>
          invite.email.toLowerCase() === email && invite.status === "pending"
      )
    ) {
      throw new Error("An invite is already pending for this email");
    }

    const existingMembers = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .take(100);
    if (
      existingMembers.some((member) => member.userEmail.toLowerCase() === email)
    ) {
      throw new Error("This user is already a member of the team");
    }

    return {
      teamId: args.teamId,
      authOrganizationId: access.team.authOrganizationId,
      email,
      role: args.role,
      actorId: access.authUser._id,
      actorName:
        access.authUser.name ?? access.authUser.email ?? "Unknown",
    };
  },
});

export const recordCreatedInvitation = internalMutation({
  args: {
    teamId: v.id("teams"),
    email: v.string(),
    role: inviteRoleValidator,
    actorId: v.string(),
    actorName: v.string(),
    authInvitationId: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  returns: createdInviteValidator,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("teamInvites")
      .withIndex("by_authInvitationId", (q) =>
        q.eq("authInvitationId", args.authInvitationId)
      )
      .unique();
    if (existing) {
      return { inviteId: existing._id, token: existing.token };
    }

    const inviteId = await ctx.db.insert("teamInvites", {
      teamId: args.teamId,
      email: args.email,
      role: args.role,
      token: args.authInvitationId,
      status: "pending",
      invitedBy: args.actorId,
      invitedByName: args.actorName,
      createdAt: args.createdAt,
      expiresAt: args.expiresAt,
      authInvitationId: args.authInvitationId,
    });

    await logTeamAction(ctx, {
      teamId: args.teamId,
      actorId: args.actorId,
      actorName: args.actorName,
      action: "member.invited",
      targetType: "invite",
      targetId: inviteId,
      targetLabel: args.email,
      meta: { role: args.role },
    });

    return { inviteId, token: args.authInvitationId };
  },
});

/** Create a Better Auth invitation, then record its local read projection. */
export const create = action({
  args: {
    teamId: v.id("teams"),
    email: v.string(),
    role: inviteRoleValidator,
  },
  returns: createdInviteValidator,
  handler: async (ctx, args): Promise<{ inviteId: Id<"teamInvites">; token: string }> => {
    const prepared: {
      teamId: Id<"teams">;
      authOrganizationId: string;
      email: string;
      role: "admin" | "member";
      actorId: string;
      actorName: string;
    } = await ctx.runQuery(internal.teamInvites.prepareCreate, args);

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    const invitation = await auth.api.createInvitation({
      body: {
        email: prepared.email,
        role: prepared.role,
        organizationId: prepared.authOrganizationId,
      },
      headers,
    });

    return await ctx.runMutation(internal.teamInvites.recordCreatedInvitation, {
      teamId: prepared.teamId,
      email: prepared.email,
      role: prepared.role,
      actorId: prepared.actorId,
      actorName: prepared.actorName,
      authInvitationId: invitation.id,
      createdAt: invitation.createdAt.getTime(),
      expiresAt: invitation.expiresAt.getTime(),
    });
  },
});

export const accept = mutation({
  args: { token: v.string() },
  returns: v.id("teams"),
  handler: async (ctx, args) => {
    const authUser = await getAuthUserOrThrow(ctx);
    const invite = await ctx.db
      .query("teamInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!invite) {
      throw new Error("Invite not found");
    }
    if (invite.status !== "pending") {
      throw new Error(`Invite has already been ${invite.status}`);
    }
    if (invite.expiresAt !== undefined && invite.expiresAt <= Date.now()) {
      throw new Error("Invite has expired");
    }
    if (invite.email.toLowerCase() !== authUser.email?.toLowerCase()) {
      throw new Error("Invite belongs to a different email address");
    }

    const team = await ctx.db.get(invite.teamId);
    if (!team) {
      throw new Error("Team not found");
    }

    let authMemberId: string | undefined;
    if (team.authOrganizationId && invite.authInvitationId) {
      const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
      await auth.api.acceptInvitation({
        body: { invitationId: invite.authInvitationId },
        headers,
      });
      await auth.api.setActiveOrganization({
        body: { organizationId: team.authOrganizationId },
        headers,
      });
      const authMember = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "member",
          where: [
            { field: "organizationId", value: team.authOrganizationId },
            { field: "userId", value: authUser._id },
          ],
        }
      );
      authMemberId = authMember?._id;
    }

    const existingMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_userId", (q) =>
        q.eq("teamId", invite.teamId).eq("userId", authUser._id)
      )
      .unique();
    if (!existingMembership) {
      await ctx.db.insert("teamMembers", {
        teamId: invite.teamId,
        userId: authUser._id,
        userName: authUser.name ?? authUser.email ?? "Unknown",
        userEmail: authUser.email ?? "",
        userAvatarUrl: authUser.image ?? undefined,
        role: invite.role,
        joinedAt: Date.now(),
        authMemberId,
      });
    }

    await ctx.db.patch(invite._id, { status: "accepted" });
    await logTeamAction(ctx, {
      teamId: invite.teamId,
      actorId: authUser._id,
      actorName: authUser.name ?? authUser.email ?? "Unknown",
      action: "member.joined",
      targetType: "member",
      targetId: authUser._id,
      targetLabel: authUser.name ?? authUser.email ?? "Unknown",
      meta: { role: invite.role, viaInvite: String(invite._id) },
    });

    return invite.teamId;
  },
});

export const revoke = mutation({
  args: { inviteId: v.id("teamInvites") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new Error("Invite not found");
    }
    if (invite.status !== "pending") {
      throw new Error("Can only revoke pending invites");
    }

    const access = await requireWorkspaceAdmin(ctx, invite.teamId);
    if (invite.authInvitationId && access.team.authOrganizationId) {
      const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
      await auth.api.cancelInvitation({
        body: { invitationId: invite.authInvitationId },
        headers,
      });
    }

    await ctx.db.patch(args.inviteId, { status: "revoked" });
    await logTeamAction(ctx, {
      teamId: invite.teamId,
      actorId: access.authUser._id,
      actorName:
        access.authUser.name ?? access.authUser.email ?? "Unknown",
      action: "invite.revoked",
      targetType: "invite",
      targetId: args.inviteId,
      targetLabel: invite.email,
    });
    return null;
  },
});
