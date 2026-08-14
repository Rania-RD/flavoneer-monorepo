import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { getAuthenticatedUserWithRole, getEffectivePermissions } from "./permissions";
import { userReturnValidator, userWithRoleReturnValidator } from "./validators";
import { workspaceRoleHasFullAccess } from "./workspaceAccess";

const CREATOR_EMAIL = "fro@gmail.com";

const normalizeEmail = (email: string | null | undefined) => email?.trim().toLowerCase() ?? "";

/**
 * Mutation to sync the betterAuth user with the local users table.
 * Role assignments are stored on organization memberships, not users.
 */
export const syncCurrentUser = mutation({
  args: {},
  returns: v.union(userReturnValidator, v.null()),
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    const normalizedEmail = normalizeEmail(authUser.email);
    const isCreator = normalizedEmail === CREATOR_EMAIL;

    // Check if user already exists
    let localUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUser._id))
      .first();

    if (localUser) {
      // Keep identity data current. The legacy users.roleId field is ignored.
      if (
        localUser.name !== (authUser.name ?? "") ||
        localUser.email !== (authUser.email ?? "") ||
        localUser.isCreator !== isCreator
      ) {
        await ctx.db.patch(localUser._id, {
          name: authUser.name ?? "",
          email: authUser.email ?? "",
          isCreator,
        });
        localUser = await ctx.db.get(localUser._id);
      }
    } else {
      const userId = await ctx.db.insert("users", {
        authUserId: authUser._id,
        name: authUser.name ?? "",
        email: authUser.email ?? "",
        isCreator,
      });

      localUser = await ctx.db.get(userId);
    }

    return localUser;
  },
});

/**
 * Get current user with role.
 */
export const getCurrentUserRole = query({
  args: { organizationId: v.id("organizations") },
  returns: v.union(userWithRoleReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUser._id))
      .first();

    if (!user) {
      return null;
    }

    const { role, workspaceRole } = await getAuthenticatedUserWithRole(ctx, args.organizationId);

    return {
      ...user,
      roleId: role?._id,
      role: role ?? undefined,
      workspaceRole,
      effectivePermissions: workspaceRoleHasFullAccess(workspaceRole)
        ? role
          ? getEffectivePermissions(role)
          : ["full_access"]
        : getEffectivePermissions(role),
    };
  },
});
