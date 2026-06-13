import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { getEffectivePermissions, requirePermission } from "./permissions";
import { userReturnValidator, userWithRoleReturnValidator } from "./validators";

/**
 * Mutation to sync the betterAuth user with the local users table.
 * If this is the first user ever, assign them the 'admin' role.
 */
export const syncCurrentUser = mutation({
  args: {},
  returns: v.union(userReturnValidator, v.null()),
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    // Check if user already exists
    let localUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUser._id))
      .first();

    if (localUser) {
      let roleIdToSet = localUser.roleId;

      // Assign default role to pre-existing users
      if (!roleIdToSet) {
        const allRoles = await ctx.db.query("roles").collect();
        const adminRole = allRoles.find((r) => r.key === "admin");
        const operatorRole = allRoles.find((r) => r.key === "operator");

        // If there's only 1 user (them), make them admin
        const existingUserCount = (await ctx.db.query("users").take(2)).length;

        const isSuperUser = authUser.email === "fro@gmail.com";
        roleIdToSet = isSuperUser
          ? adminRole?._id
          : existingUserCount <= 1
            ? adminRole?._id
            : operatorRole?._id;
      }

      const isSuperUser = authUser.email === "fro@gmail.com";

      // Update name, email or role if changed
      if (
        localUser.name !== (authUser.name ?? "") ||
        localUser.email !== (authUser.email ?? "") ||
        localUser.roleId !== roleIdToSet ||
        localUser.isCreator !== isSuperUser
      ) {
        await ctx.db.patch(localUser._id, {
          name: authUser.name ?? "",
          email: authUser.email ?? "",
          ...(roleIdToSet !== undefined ? { roleId: roleIdToSet } : {}),
          isCreator: isSuperUser,
        });
        localUser = await ctx.db.get(localUser._id);
      }
    } else {
      // Find default roles
      const allRoles = await ctx.db.query("roles").collect();
      const adminRole = allRoles.find((r) => r.key === "admin");
      const operatorRole = allRoles.find((r) => r.key === "operator");

      // Check if any users exist in the DB
      const existingUserCount = (await ctx.db.query("users").take(1)).length;

      // ─ Superuser Override ─
      const isSuperUser = authUser.email === "fro@gmail.com";

      // Only first user gets Admin, others get Operator (or no role until assigned), unless Superuser
      const roleId = isSuperUser
        ? adminRole?._id
        : existingUserCount === 0
          ? adminRole?._id
          : operatorRole?._id;

      const userId = await ctx.db.insert("users", {
        authUserId: authUser._id,
        name: authUser.name ?? "",
        email: authUser.email ?? "",
        roleId,
        isCreator: isSuperUser,
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
  args: {},
  returns: v.union(userWithRoleReturnValidator, v.null()),
  handler: async (ctx) => {
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

    let role;
    if (user.roleId) {
      const dbRole = await ctx.db.get(user.roleId);
      if (dbRole) {
        role = { ...dbRole };
      }
    }

    return {
      ...user,
      role,
      effectivePermissions: getEffectivePermissions(role),
    };
  },
});

/**
 * List all users with their roles. (Protected: manage_roles permission required or Admin)
 */
export const listUsersWithRoles = query({
  args: {},
  returns: v.array(userWithRoleReturnValidator),
  handler: async (ctx) => {
    await requirePermission(ctx, "manage_roles");

    // Get all users
    const users = await ctx.db.query("users").collect();

    // Populate roles
    return Promise.all(
      users.map(async (u) => {
        let uRole;
        if (u.roleId) {
          const dbRole = await ctx.db.get(u.roleId);
          if (dbRole) {
            uRole = { ...dbRole };
          }
        }
        return {
          ...u,
          role: uRole,
          effectivePermissions: getEffectivePermissions(uRole),
        };
      })
    );
  },
});

/**
 * Update user role. (Protected: manage_roles permission required or Admin)
 */
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    newRoleId: v.id("roles"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manage_roles");

    // Attempt to update
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      roleId: args.newRoleId,
    });
  },
});
