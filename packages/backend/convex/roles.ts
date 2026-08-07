import { v } from "convex/values";
import { isConfigurableSystemRole } from "../lib/system-role-access";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { getEffectivePermissions, requirePermission } from "./permissions";
import { roleReturnValidator } from "./validators";

const DEFAULT_SYSTEM_ROLES = [
  {
    description: "Complete access to all formulation lab capabilities.",
    key: "admin",
    name: "Admin",
    permissions: [
      "full_access",
      "manage_roles",
      "manage_version_control",
      "edit_procedures",
      "sign_off",
      "execute_runs",
      "record_production_checks",
      "review_production_checks",
      "view_production_checks",
      "manage_production_specifications",
      "manage_production_line_settings",
    ],
  },
  {
    description: "Can supervise procedures, approvals, and laboratory runs.",
    key: "supervisor",
    name: "Supervisor",
    permissions: ["edit_procedures", "sign_off", "execute_runs"],
  },
  {
    description: "Can create and maintain formulation procedures.",
    key: "editor",
    name: "Editor",
    permissions: ["edit_procedures"],
  },
  {
    description: "Can execute approved formulation runs.",
    key: "operator",
    name: "Operator",
    permissions: ["execute_runs"],
  },
  {
    description: "Can create and submit production-line inspection records.",
    key: "quality_officer",
    name: "Quality Officer",
    permissions: ["record_production_checks", "view_production_checks"],
  },
  {
    description: "Can review and approve production-line inspection records.",
    key: "production_manager",
    name: "Production Manager",
    permissions: ["review_production_checks", "view_production_checks"],
  },
] as const;

/**
 * Ensure every built-in system role exists without overwriting configured
 * permissions on roles that administrators have already customized.
 */
export async function ensureDefaultRoles(ctx: MutationCtx): Promise<Doc<"roles">[]> {
  const existingRoles = await ctx.db.query("roles").collect();
  const existingKeys = new Set(existingRoles.map((role) => role.key));

  for (const role of DEFAULT_SYSTEM_ROLES) {
    if (!existingKeys.has(role.key)) {
      await ctx.db.insert("roles", {
        ...role,
        permissions: [...role.permissions],
      });
    }
  }

  return await ctx.db.query("roles").collect();
}

/**
 * Bootstrap built-in roles for a fresh deployment. Once any role exists,
 * callers must have role-management permission.
 */
export const initializeDefaultRoles = mutation({
  args: {},
  returns: v.array(roleReturnValidator),
  handler: async (ctx) => {
    const existingRole = await ctx.db.query("roles").first();
    if (existingRole) {
      await requirePermission(ctx, "manage_roles");
    }

    return await ensureDefaultRoles(ctx);
  },
});

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

    if (!isConfigurableSystemRole(targetRole)) {
      throw new Error("Admin permissions are fixed and cannot be updated");
    }

    const permissions = getEffectivePermissions({
      ...targetRole,
      permissions: args.permissions,
    });

    await ctx.db.patch(args.roleId, {
      permissions,
    });
  },
});
