import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePermission } from "./permissions";
import { roleReturnValidator } from "./validators";

/**
 * List all available roles
 */
export const list = query({
  args: {},
  returns: v.array(roleReturnValidator),
  handler: async (ctx) => {
    await requirePermission(ctx, "manage_roles");
    return await ctx.db.query("roles").collect();
  },
});

/**
 * Update a role's permissions
 */
export const updateRolePermissions = mutation({
  args: {
    roleId: v.id("roles"),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manage_roles");

    // Attempt to update
    const targetRole = await ctx.db.get(args.roleId);
    if (!targetRole) {
      throw new Error("Role not found");
    }

    if (targetRole.key === "admin" && !args.permissions.includes("full_access")) {
      throw new Error("Admin role must keep full access");
    }

    await ctx.db.patch(args.roleId, {
      permissions: args.permissions,
    });
  },
});

/**
 * Initialize default roles if they don't exist
 * Called on startup or manually if needed
 */
