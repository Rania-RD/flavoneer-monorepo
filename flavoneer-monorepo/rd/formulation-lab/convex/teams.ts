import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { logTeamAction } from "./teamAuditLogs";
import { teamReturnValidator, teamWithRoleReturnValidator } from "./validators";

// ─── Helpers ──────────────────────────────────────────
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

// ─── Queries ──────────────────────────────────────────

/** Get a single team by ID */
export const get = query({
  args: { id: v.id("teams") },
  returns: v.union(teamReturnValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/** List all teams the authenticated user belongs to */
export const list = query({
  args: {},
  returns: v.array(teamWithRoleReturnValidator),
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      return [];
    }

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_userId", (q) => q.eq("userId", authUser._id))
      .collect();

    const teams = await Promise.all(
      memberships.map(async (m) => {
        const team = await ctx.db.get(m.teamId);
        return team ? { ...team, role: m.role } : null;
      })
    );
    return teams.filter((t): t is NonNullable<typeof t> => t !== null);
  },
});

// ─── Mutations ────────────────────────────────────────

/** Create a new team + add the caller as owner */
export const create = mutation({
  args: {
    name: v.string(),
  },
  returns: v.id("teams"),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    const slug = slugify(args.name) + "-" + Date.now().toString(36);

    const teamId = await ctx.db.insert("teams", {
      name: args.name,
      slug,
      ownerId: authUser._id,
      createdAt: Date.now(),
    });

    // Add creator as owner member
    await ctx.db.insert("teamMembers", {
      teamId,
      userId: authUser._id,
      userName: authUser.name ?? authUser.email ?? "Unknown",
      userEmail: authUser.email ?? "",
      userAvatarUrl: authUser.image ?? undefined,
      role: "owner",
      joinedAt: Date.now(),
    });

    // Auto-assign 'admin' app role to the team creator
    const creatorUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUser._id))
      .first();

    if (creatorUser) {
      const allRoles = await ctx.db.query("roles").collect();
      const adminRole = allRoles.find((r) => r.key === "admin");

      if (adminRole) {
        await ctx.db.patch(creatorUser._id, {
          roleId: adminRole._id,
        });
      }
    }

    // Audit log
    await logTeamAction(ctx, {
      teamId,
      actorId: authUser._id,
      actorName: authUser.name ?? authUser.email ?? "Unknown",
      action: "team.created",
      targetType: "team",
      targetId: teamId,
      targetLabel: args.name,
    });

    return teamId;
  },
});

/** Update team name (admin+ only) */
export const update = mutation({
  args: {
    id: v.id("teams"),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    autoVersioning: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    // Permission check: admin or owner
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId_userId", (q) =>
        q.eq("teamId", args.id).eq("userId", authUser._id)
      )
      .first();
    if (!membership || membership.role === "member") {
      throw new Error("Insufficient permissions");
    }

    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(id, filtered);

    await logTeamAction(ctx, {
      teamId: id,
      actorId: authUser._id,
      actorName: authUser.name ?? authUser.email ?? "Unknown",
      action: "team.updated",
      targetType: "team",
      targetId: id,
      meta: filtered as Record<string, string>,
    });
    return null;
  },
});

/** Delete a team (owner only) — cascades members, invites, audit logs */
export const remove = mutation({
  args: { id: v.id("teams") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    const team = await ctx.db.get(args.id);
    if (!team) {
      throw new Error("Team not found");
    }
    if (team.ownerId !== authUser._id) {
      throw new Error("Only the team owner can delete the team");
    }

    // Cascade: delete all members
    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.id))
      .collect();
    for (const m of members) {
      await ctx.db.delete(m._id);
    }

    // Cascade: delete all invites
    const invites = await ctx.db
      .query("teamInvites")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.id))
      .collect();
    for (const inv of invites) {
      await ctx.db.delete(inv._id);
    }

    // Cascade: delete all audit logs
    const logs = await ctx.db
      .query("teamAuditLogs")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.id))
      .collect();
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }

    // Finally delete the team itself
    await ctx.db.delete(args.id);
    return null;
  },
});
