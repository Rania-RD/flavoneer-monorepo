import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { logTeamAction } from "./teamAuditLogs";
import { teamReturnValidator, teamWithRoleReturnValidator } from "./validators";
import {
  getAuthUserOrThrow,
  requireWorkspaceAdmin,
  requireWorkspaceMember,
  requireWorkspaceOwner,
} from "./workspaceAccess";
import { ensureDefaultRoles } from "./roles";

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
    const access = await requireWorkspaceMember(ctx, args.id);
    return access.team;
  },
});

/** List all teams the authenticated user belongs to */
export const list = query({
  args: {},
  returns: v.array(teamWithRoleReturnValidator),
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return [];
    }

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_userId", (q) => q.eq("userId", authUser._id))
      .take(100);

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
    const authUser = await getAuthUserOrThrow(ctx);

    const slug = `${slugify(args.name)}-${Date.now().toString(36)}`;
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    const organization = await auth.api.createOrganization({
      body: {
        name: args.name,
        slug,
      },
      headers,
    });
    const ownerMember = organization.members.find(
      (member) => member?.userId === authUser._id
    );

    const teamId = await ctx.db.insert("teams", {
      name: args.name,
      slug,
      ownerId: authUser._id,
      createdAt: Date.now(),
      authOrganizationId: organization.id,
    });

    await ctx.db.insert("teamMembers", {
      teamId,
      userId: authUser._id,
      userName: authUser.name ?? authUser.email ?? "Unknown",
      userEmail: authUser.email ?? "",
      userAvatarUrl: authUser.image ?? undefined,
      role: "owner",
      joinedAt: Date.now(),
      authMemberId: ownerMember?.id,
    });

    const localUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUser._id))
      .first();
    const roles = await ensureDefaultRoles(ctx);
    const adminRole = roles.find((role) => role.key === "admin");
    if (!adminRole) {
      throw new Error("Admin system role is not initialized");
    }

    if (!localUser) {
      await ctx.db.insert("users", {
        authUserId: authUser._id,
        name: authUser.name ?? "",
        email: authUser.email ?? "",
        roleId: adminRole._id,
      });
    } else if (localUser.roleId !== adminRole._id) {
      await ctx.db.patch(localUser._id, { roleId: adminRole._id });
    }

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
    const { authUser, team } = await requireWorkspaceAdmin(ctx, args.id);

    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    if (team.authOrganizationId && (args.name || args.avatarUrl)) {
      const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
      await auth.api.updateOrganization({
        body: {
          organizationId: team.authOrganizationId,
          data: {
            ...(args.name ? { name: args.name } : {}),
            ...(args.avatarUrl ? { logo: args.avatarUrl } : {}),
          },
        },
        headers,
      });
    }
    await ctx.db.patch(id, filtered);

    const meta = Object.fromEntries(
      Object.entries(filtered).map(([key, value]) => [key, String(value)])
    );

    await logTeamAction(ctx, {
      teamId: id,
      actorId: authUser._id,
      actorName: authUser.name ?? authUser.email ?? "Unknown",
      action: "team.updated",
      targetType: "team",
      targetId: id,
      meta,
    });
    return null;
  },
});

/** Delete an empty team (owner only), including its Better Auth organization. */
export const remove = mutation({
  args: { id: v.id("teams") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { team } = await requireWorkspaceOwner(ctx, args.id);

    const project = await ctx.db
      .query("projects")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.id))
      .first();
    const ingredient = await ctx.db
      .query("ingredients")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.id))
      .first();
    if (project || ingredient) {
      throw new Error(
        "Archive or move workspace records before deleting this team"
      );
    }

    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.id))
      .take(101);
    if (members.length > 100) {
      throw new Error("Team exceeds the supported membership limit");
    }

    const invites = await ctx.db
      .query("teamInvites")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.id))
      .take(101);
    if (invites.length > 100) {
      throw new Error("Team exceeds the supported invitation limit");
    }

    if (team.authOrganizationId) {
      const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
      await auth.api.deleteOrganization({
        body: { organizationId: team.authOrganizationId },
        headers,
      });
    }

    for (const m of members) {
      await ctx.db.delete(m._id);
    }

    for (const inv of invites) {
      await ctx.db.delete(inv._id);
    }

    await ctx.db.delete(args.id);
    return null;
  },
});
