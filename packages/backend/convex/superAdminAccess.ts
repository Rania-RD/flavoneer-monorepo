import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { authComponent } from "./auth";

type SuperAdminCtx = QueryCtx | MutationCtx;
const SUPER_ADMIN_EMAIL = "zeta.food@gmail.com";

export interface SuperAdminIdentity {
  authUser: NonNullable<Awaited<ReturnType<typeof authComponent.getAuthUser>>>;
  user: Doc<"users">;
}

export async function getSuperAdminIdentity(
  ctx: SuperAdminCtx,
): Promise<SuperAdminIdentity | null> {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_authUserId", (query) => query.eq("authUserId", authUser._id))
    .unique();

  if (
    !user?.isCreator ||
    user.email?.trim().toLowerCase() !== SUPER_ADMIN_EMAIL
  ) {
    return null;
  }

  return { authUser, user };
}

export async function requireSuperAdmin(ctx: SuperAdminCtx): Promise<SuperAdminIdentity> {
  const identity = await getSuperAdminIdentity(ctx);
  if (!identity) {
    throw new Error("Super admin access required");
  }
  return identity;
}
