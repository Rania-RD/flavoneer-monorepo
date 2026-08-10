import { getEffectiveSystemPermissions, systemRoleHasPermission } from "../lib/system-role-access";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { authComponent } from "./auth";

type ConvexCtx = QueryCtx | MutationCtx;

interface AuthenticatedUserWithRole {
  user: Doc<"users">;
  role: Doc<"roles"> | null;
}

export function getEffectivePermissions(role: Doc<"roles"> | null | undefined) {
  return getEffectiveSystemPermissions(role);
}

export function roleHasPermission(role: Doc<"roles"> | null | undefined, permissionKey: string) {
  return systemRoleHasPermission(role, permissionKey);
}

export async function getAuthenticatedUserWithRole(
  ctx: ConvexCtx,
): Promise<AuthenticatedUserWithRole> {
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_authUserId", (q) => q.eq("authUserId", authUser._id))
    .first();

  if (!user) {
    throw new Error("User not found");
  }

  const role = user.roleId ? await ctx.db.get(user.roleId) : null;

  return { user, role };
}

export async function requirePermission(
  ctx: ConvexCtx,
  permissionKey: string,
): Promise<AuthenticatedUserWithRole> {
  const currentUser = await getAuthenticatedUserWithRole(ctx);

  if (!roleHasPermission(currentUser.role, permissionKey)) {
    throw new Error("Insufficient permissions");
  }

  return currentUser;
}
