import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { logTeamAction } from "./teamAuditLogs";
import { inviteRoleValidator, teamInviteReturnValidator } from "./validators";

// ─── Helpers ──────────────────────────────────────────
function generateToken(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ─── Queries ──────────────────────────────────────────

/** List all invites for a team (admin+ only) */
export const listByTeam = query({
  args: { teamId: v.id("teams") },
  returns: v.array(teamInviteReturnValidator),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    // Permission check: admin or owner
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_userId", (q) =>
        q.eq("teamId", args.teamId).eq("userId", authUser._id)
      )
      .first();
    if (!membership || membership.role === "member") {
      return [];
    }

    return await ctx.db
      .query("teamInvites")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .collect();
  },
});

// ─── Mutations ────────────────────────────────────────

/** Create a pending invite (admin+ only) */
export const create = mutation({
  args: {
    teamId: v.id("teams"),
    email: v.string(),
    role: inviteRoleValidator,
  },
  returns: v.object({ inviteId: v.id("teamInvites"), token: v.string() }),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    // Permission check
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_userId", (q) =>
        q.eq("teamId", args.teamId).eq("userId", authUser._id)
      )
      .first();
    if (!membership || membership.role === "member") {
      throw new Error("Insufficient permissions");
    }

    // Check if already invited with pending status
    const existing = await ctx.db
      .query("teamInvites")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();
    const alreadyPending = existing.find(
      (inv) => inv.email === args.email && inv.status === "pending"
    );
    if (alreadyPending) {
      throw new Error("An invite is already pending for this email");
    }

    // Check if already a member
    const existingMembers = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .collect();
    const alreadyMember = existingMembers.find(
      (m) => m.userEmail === args.email
    );
    if (alreadyMember) {
      throw new Error("This user is already a member of the team");
    }

    const token = generateToken();

    const inviteId = await ctx.db.insert("teamInvites", {
      teamId: args.teamId,
      email: args.email,
      role: args.role,
      token,
      status: "pending",
      invitedBy: authUser._id,
      invitedByName: authUser.name ?? authUser.email ?? "Unknown",
      createdAt: Date.now(),
    });

    // TODO: send invite email with link containing the token

    await logTeamAction(ctx, {
      teamId: args.teamId,
      actorId: authUser._id,
      actorName: authUser.name ?? authUser.email ?? "Unknown",
      action: "member.invited",
      targetType: "invite",
      targetId: inviteId,
      targetLabel: args.email,
      meta: { role: args.role },
    });

    return { inviteId, token };
  },
});

/** Accept an invite by token (authed user) */
export const accept = mutation({
  args: { token: v.string() },
  returns: v.id("teams"),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    const invite = await ctx.db
      .query("teamInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!invite) {
      throw new Error("Invite not found");
    }
    if (invite.status !== "pending") {
      throw new Error(`Invite has already been ${invite.status}`);
    }

    // Check not already a member
    const existingMembership = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_userId", (q) =>
        q.eq("teamId", invite.teamId).eq("userId", authUser._id)
      )
      .first();
    if (existingMembership) {
      // Already a member — just mark invite as accepted
      await ctx.db.patch(invite._id, { status: "accepted" });
      return invite.teamId;
    }

    // Create membership
    await ctx.db.insert("teamMembers", {
      teamId: invite.teamId,
      userId: authUser._id,
      userName: authUser.name ?? authUser.email ?? "Unknown",
      userEmail: authUser.email ?? "",
      userAvatarUrl: authUser.image ?? undefined,
      role: invite.role,
      joinedAt: Date.now(),
    });

    // Mark invite as accepted
    await ctx.db.patch(invite._id, { status: "accepted" });

    await logTeamAction(ctx, {
      teamId: invite.teamId,
      actorId: authUser._id,
      actorName: authUser.name ?? authUser.email ?? "Unknown",
      action: "member.joined",
      targetType: "member",
      targetId: authUser._id,
      targetLabel: authUser.name ?? authUser.email ?? "Unknown",
      meta: { role: invite.role, viaInvite: invite._id },
    });

    return invite.teamId;
  },
});

/** Revoke a pending invite (admin+ only) */
export const revoke = mutation({
  args: { inviteId: v.id("teamInvites") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new Error("Invite not found");
    }
    if (invite.status !== "pending") {
      throw new Error("Can only revoke pending invites");
    }

    // Permission check
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_userId", (q) =>
        q.eq("teamId", invite.teamId).eq("userId", authUser._id)
      )
      .first();
    if (!membership || membership.role === "member") {
      throw new Error("Insufficient permissions");
    }

    await ctx.db.patch(args.inviteId, { status: "revoked" });

    await logTeamAction(ctx, {
      teamId: invite.teamId,
      actorId: authUser._id,
      actorName: authUser.name ?? authUser.email ?? "Unknown",
      action: "invite.revoked",
      targetType: "invite",
      targetId: args.inviteId,
      targetLabel: invite.email,
    });
    return null;
  },
});
