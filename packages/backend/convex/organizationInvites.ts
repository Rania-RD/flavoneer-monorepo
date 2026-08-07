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
import { logOrganizationAction } from "./organizationAuditLogs";
import { inviteRoleValidator, organizationInviteReturnValidator } from "./validators";
import {
  getAuthUserOrThrow,
  requireWorkspaceAdmin,
} from "./workspaceAccess";

const createdInviteValidator = v.object({
  inviteId: v.id("organizationInvites"),
  token: v.string(),
});

export const listByOrganization = query({
  args: { organizationId: v.id("organizations") },
  returns: v.array(organizationInviteReturnValidator),
  handler: async (ctx, args) => {
    await requireWorkspaceAdmin(ctx, args.organizationId);
    return await ctx.db
      .query("organizationInvites")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(100);
  },
});

export const prepareCreate = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    role: inviteRoleValidator,
  },
  returns: v.object({
    organizationId: v.id("organizations"),
    authOrganizationId: v.string(),
    email: v.string(),
    role: inviteRoleValidator,
    actorId: v.string(),
    actorName: v.string(),
  }),
  handler: async (ctx, args) => {
    const access = await requireWorkspaceAdmin(ctx, args.organizationId);
    if (!access.organization.authOrganizationId) {
      throw new Error("Organization must be migrated before inviting members");
    }

    const email = args.email.trim().toLowerCase();
    const existingInvites = await ctx.db
      .query("organizationInvites")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
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
      .query("organizationMembers")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .take(100);
    if (
      existingMembers.some((member) => member.userEmail.toLowerCase() === email)
    ) {
      throw new Error("This user is already a member of the organization");
    }

    return {
      organizationId: args.organizationId,
      authOrganizationId: access.organization.authOrganizationId,
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
    organizationId: v.id("organizations"),
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
      .query("organizationInvites")
      .withIndex("by_authInvitationId", (q) =>
        q.eq("authInvitationId", args.authInvitationId)
      )
      .unique();
    if (existing) {
      return { inviteId: existing._id, token: existing.token };
    }

    const inviteId = await ctx.db.insert("organizationInvites", {
      organizationId: args.organizationId,
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

    await logOrganizationAction(ctx, {
      organizationId: args.organizationId,
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
    organizationId: v.id("organizations"),
    email: v.string(),
    role: inviteRoleValidator,
  },
  returns: createdInviteValidator,
  handler: async (ctx, args): Promise<{ inviteId: Id<"organizationInvites">; token: string }> => {
    const prepared: {
      organizationId: Id<"organizations">;
      authOrganizationId: string;
      email: string;
      role: "admin" | "member";
      actorId: string;
      actorName: string;
    } = await ctx.runQuery(internal.organizationInvites.prepareCreate, args);

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    const invitation = await auth.api.createInvitation({
      body: {
        email: prepared.email,
        role: prepared.role,
        organizationId: prepared.authOrganizationId,
      },
      headers,
    });

    return await ctx.runMutation(internal.organizationInvites.recordCreatedInvitation, {
      organizationId: prepared.organizationId,
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
  returns: v.id("organizations"),
  handler: async (ctx, args) => {
    const authUser = await getAuthUserOrThrow(ctx);
    const invite = await ctx.db
      .query("organizationInvites")
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

    const organization = await ctx.db.get(invite.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    let authMemberId: string | undefined;
    if (organization.authOrganizationId && invite.authInvitationId) {
      const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
      await auth.api.acceptInvitation({
        body: { invitationId: invite.authInvitationId },
        headers,
      });
      await auth.api.setActiveOrganization({
        body: { organizationId: organization.authOrganizationId },
        headers,
      });
      const authMember = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "member",
          where: [
            { field: "organizationId", value: organization.authOrganizationId },
            { field: "userId", value: authUser._id },
          ],
        }
      );
      authMemberId = authMember?._id;
    }

    const existingMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organizationId_and_userId", (q) =>
        q.eq("organizationId", invite.organizationId).eq("userId", authUser._id)
      )
      .unique();
    if (!existingMembership) {
      await ctx.db.insert("organizationMembers", {
        organizationId: invite.organizationId,
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
    await logOrganizationAction(ctx, {
      organizationId: invite.organizationId,
      actorId: authUser._id,
      actorName: authUser.name ?? authUser.email ?? "Unknown",
      action: "member.joined",
      targetType: "member",
      targetId: authUser._id,
      targetLabel: authUser.name ?? authUser.email ?? "Unknown",
      meta: { role: invite.role, viaInvite: String(invite._id) },
    });

    return invite.organizationId;
  },
});

export const revoke = mutation({
  args: { inviteId: v.id("organizationInvites") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new Error("Invite not found");
    }
    if (invite.status !== "pending") {
      throw new Error("Can only revoke pending invites");
    }

    const access = await requireWorkspaceAdmin(ctx, invite.organizationId);
    if (invite.authInvitationId && access.organization.authOrganizationId) {
      const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
      await auth.api.cancelInvitation({
        body: { invitationId: invite.authInvitationId },
        headers,
      });
    }

    await ctx.db.patch(args.inviteId, { status: "revoked" });
    await logOrganizationAction(ctx, {
      organizationId: invite.organizationId,
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
