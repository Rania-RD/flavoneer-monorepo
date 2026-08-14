import { getEffectiveSystemPermissions, systemRoleHasPermission } from "../lib/system-role-access";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  requireWorkspaceMember,
  type WorkspaceRole,
  workspaceRoleHasFullAccess,
} from "./workspaceAccess";

type ConvexCtx = QueryCtx | MutationCtx;

interface AuthenticatedUserWithRole {
  user: Doc<"users">;
  membership: Doc<"organizationMembers"> | null;
  role: Doc<"roles"> | null;
  workspaceRole: WorkspaceRole;
}

export function getEffectivePermissions(role: Doc<"roles"> | null | undefined) {
  return getEffectiveSystemPermissions(role);
}

export function roleHasPermission(role: Doc<"roles"> | null | undefined, permissionKey: string) {
  return systemRoleHasPermission(role, permissionKey);
}

export async function getAuthenticatedUserWithRole(
  ctx: ConvexCtx,
  organizationId: Id<"organizations">,
): Promise<AuthenticatedUserWithRole> {
  const access = await requireWorkspaceMember(ctx, organizationId);
  const authUser = access.authUser;

  const user = await ctx.db
    .query("users")
    .withIndex("by_authUserId", (q) => q.eq("authUserId", authUser._id))
    .first();

  if (!user) {
    throw new Error("User not found");
  }

  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organizationId_and_userId", (q) =>
      q.eq("organizationId", organizationId).eq("userId", authUser._id),
    )
    .unique();

  let role: Doc<"roles"> | null = null;
  if (workspaceRoleHasFullAccess(access.role)) {
    role = await ctx.db
      .query("roles")
      .withIndex("by_organizationId_and_key", (q) =>
        q.eq("organizationId", organizationId).eq("key", "admin"),
      )
      .unique();
  } else {
    role = membership?.roleId ? await ctx.db.get(membership.roleId) : null;
    if (role && role.organizationId !== organizationId) {
      throw new Error("Role assignment does not belong to this organization");
    }

    if (!role) {
      role = await ctx.db
        .query("roles")
        .withIndex("by_organizationId_and_key", (q) =>
          q.eq("organizationId", organizationId).eq("key", "operator"),
        )
        .unique();
    }
  }

  return { user, membership, role, workspaceRole: access.role };
}

export async function requirePermission(
  ctx: ConvexCtx,
  organizationId: Id<"organizations">,
  permissionKey: string,
): Promise<AuthenticatedUserWithRole> {
  const currentUser = await getAuthenticatedUserWithRole(ctx, organizationId);

  if (
    !workspaceRoleHasFullAccess(currentUser.workspaceRole) &&
    !roleHasPermission(currentUser.role, permissionKey)
  ) {
    throw new Error("Insufficient permissions");
  }

  return currentUser;
}
