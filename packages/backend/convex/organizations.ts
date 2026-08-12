import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { logOrganizationAction } from "./organizationAuditLogs";
import { ensureDefaultRoles } from "./roles";
import { organizationReturnValidator, organizationWithRoleReturnValidator } from "./validators";
import {
  getAuthUserOrThrow,
  requireWorkspaceAdmin,
  requireWorkspaceMember,
  requireWorkspaceOwner,
} from "./workspaceAccess";

// ─── Helpers ──────────────────────────────────────────
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

// ─── Queries ──────────────────────────────────────────

/** Get a single organization by ID */
export const get = query({
  args: { id: v.id("organizations") },
  returns: v.union(organizationReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const access = await requireWorkspaceMember(ctx, args.id);
    return access.organization;
  },
});

/** List all organizations the authenticated user belongs to */
export const list = query({
  args: {},
  returns: v.array(organizationWithRoleReturnValidator),
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return [];
    }

    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_userId", (q) => q.eq("userId", authUser._id))
      .take(100);

    const organizations = await Promise.all(
      memberships.map(async (m) => {
        const organization = await ctx.db.get(m.organizationId);
        return organization ? { ...organization, role: m.role } : null;
      }),
    );
    return organizations.filter((t): t is NonNullable<typeof t> => t !== null);
  },
});

// ─── Mutations ────────────────────────────────────────

/** Create a new organization + add the caller as owner */
export const create = mutation({
  args: {
    name: v.string(),
  },
  returns: v.id("organizations"),
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
    const ownerMember = organization.members.find((member) => member?.userId === authUser._id);

    const organizationId = await ctx.db.insert("organizations", {
      name: args.name,
      slug,
      ownerId: authUser._id,
      createdAt: Date.now(),
      authOrganizationId: organization.id,
      status: "active",
    });

    const roles = await ensureDefaultRoles(ctx, organizationId);
    const adminRole = roles.find((role) => role.key === "admin");
    if (!adminRole) {
      throw new Error("Admin system role is not initialized");
    }

    await ctx.db.insert("organizationMembers", {
      organizationId,
      userId: authUser._id,
      userName: authUser.name ?? authUser.email ?? "Unknown",
      userEmail: authUser.email ?? "",
      userAvatarUrl: authUser.image ?? undefined,
      role: "owner",
      roleId: adminRole._id,
      joinedAt: Date.now(),
      authMemberId: ownerMember?.id,
    });

    const localUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUser._id))
      .first();
    if (!localUser) {
      await ctx.db.insert("users", {
        authUserId: authUser._id,
        name: authUser.name ?? "",
        email: authUser.email ?? "",
      });
    }

    await logOrganizationAction(ctx, {
      organizationId,
      actorId: authUser._id,
      actorName: authUser.name ?? authUser.email ?? "Unknown",
      action: "organization.created",
      targetType: "organization",
      targetId: organizationId,
      targetLabel: args.name,
    });

    return organizationId;
  },
});

/** Update organization settings (admin+ only) */
export const update = mutation({
  args: {
    id: v.id("organizations"),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.union(v.string(), v.null())),
    autoVersioning: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { authUser, organization } = await requireWorkspaceAdmin(ctx, args.id);

    const { avatarUrl, id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined),
    );
    if (
      organization.authOrganizationId &&
      (args.name !== undefined || args.avatarUrl !== undefined)
    ) {
      const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
      await auth.api.updateOrganization({
        body: {
          organizationId: organization.authOrganizationId,
          data: {
            ...(args.name !== undefined ? { name: args.name } : {}),
            ...(args.avatarUrl !== undefined ? { logo: args.avatarUrl ?? "" } : {}),
          },
        },
        headers,
      });
    }
    const databaseUpdates = {
      ...filtered,
      ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl ?? undefined } : {}),
    };
    await ctx.db.patch(id, databaseUpdates);

    const meta = Object.fromEntries(
      Object.entries({ ...filtered, avatarUrl }).flatMap(([key, value]) =>
        value === undefined ? [] : [[key, value === null ? "removed" : String(value)]],
      ),
    );

    await logOrganizationAction(ctx, {
      organizationId: id,
      actorId: authUser._id,
      actorName: authUser.name ?? authUser.email ?? "Unknown",
      action: "organization.updated",
      targetType: "organization",
      targetId: id,
      meta,
    });
    return null;
  },
});

/** Delete an empty organization (owner only), including its Better Auth organization. */
export const remove = mutation({
  args: { id: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { organization } = await requireWorkspaceOwner(ctx, args.id);

    const project = await ctx.db
      .query("projects")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.id))
      .first();
    const ingredient = await ctx.db
      .query("ingredients")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.id))
      .first();
    if (project || ingredient) {
      throw new Error("Archive or move workspace records before deleting this organization");
    }

    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.id))
      .take(101);
    if (members.length > 100) {
      throw new Error("Organization exceeds the supported membership limit");
    }

    const invites = await ctx.db
      .query("organizationInvites")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.id))
      .take(101);
    if (invites.length > 100) {
      throw new Error("Organization exceeds the supported invitation limit");
    }

    if (organization.authOrganizationId) {
      const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
      await auth.api.deleteOrganization({
        body: { organizationId: organization.authOrganizationId },
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
