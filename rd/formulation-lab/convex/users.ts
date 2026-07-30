import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { getEffectivePermissions, requirePermission } from "./permissions";
import { ensureDefaultRoles } from "./roles";
import { userReturnValidator, userWithRoleReturnValidator } from "./validators";

const CREATOR_EMAIL = "fro@gmail.com";

const normalizeEmail = (email: string | null | undefined) =>
  email?.trim().toLowerCase() ?? "";

/**
 * Mutation to sync the betterAuth user with the local users table.
 * Only the first local user receives Admin; later users receive Operator.
 */
export const syncCurrentUser = mutation({
  args: {},
  returns: v.union(userReturnValidator, v.null()),
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    const allRoles = await ensureDefaultRoles(ctx);
    const adminRole = allRoles.find((role) => role.key === "admin");
    const operatorRole = allRoles.find((role) => role.key === "operator");
    if (!(adminRole && operatorRole)) {
      throw new Error("Default system roles are not initialized");
    }

    const normalizedEmail = normalizeEmail(authUser.email);
    const isCreator = normalizedEmail === CREATOR_EMAIL;

    // Check if user already exists
    let localUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUser._id))
      .first();

    if (localUser) {
      let roleIdToSet = localUser.roleId;

      // Assign default role to pre-existing users
      if (!roleIdToSet) {
        // If there's only 1 user (them), make them admin
        const existingUserCount = (await ctx.db.query("users").take(2)).length;

        roleIdToSet =
          existingUserCount <= 1 ? adminRole?._id : operatorRole?._id;
      }

      // Update name, email or role if changed
      if (
        localUser.name !== (authUser.name ?? "") ||
        localUser.email !== (authUser.email ?? "") ||
        localUser.roleId !== roleIdToSet ||
        localUser.isCreator !== isCreator
      ) {
        await ctx.db.patch(localUser._id, {
          name: authUser.name ?? "",
          email: authUser.email ?? "",
          roleId: roleIdToSet,
          isCreator,
        });
        localUser = await ctx.db.get(localUser._id);
      }
    } else {
      // Check if any users exist in the DB
      const existingUserCount = (await ctx.db.query("users").take(1)).length;

      const roleId = existingUserCount === 0 ? adminRole._id : operatorRole._id;

      const userId = await ctx.db.insert("users", {
        authUserId: authUser._id,
        name: authUser.name ?? "",
        email: authUser.email ?? "",
        roleId,
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

    let role: Doc<"roles"> | undefined;
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
        let uRole: Doc<"roles"> | undefined;
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
