import type { GenericCtx } from "@convex-dev/better-auth";
import type { Doc, Id } from "./_generated/dataModel";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { authComponent } from "./auth";

export type WorkspaceRole = "owner" | "admin" | "member";

type WorkspaceCtx = QueryCtx | MutationCtx;

interface WorkspaceAccess {
  authUser: Awaited<ReturnType<typeof authComponent.getAuthUser>>;
  organization: Doc<"organizations">;
  role: WorkspaceRole;
  authMemberId?: string;
}

function normalizeWorkspaceRole(role: string): WorkspaceRole {
  if (role === "owner" || role === "admin") {
    return role;
  }
  return "member";
}

export async function getAuthUserOrThrow(
  ctx: GenericCtx<DataModel>
): Promise<Awaited<ReturnType<typeof authComponent.getAuthUser>>> {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) {
    throw new Error("Not authenticated");
  }
  return authUser;
}

export async function getWorkspaceAccess(
  ctx: WorkspaceCtx,
  organizationId: Id<"organizations">
): Promise<WorkspaceAccess | null> {
  const authUser = await getAuthUserOrThrow(ctx);
  const organization = await ctx.db.get(organizationId);
  if (!organization) {
    return null;
  }

  if (organization.authOrganizationId) {
    const member = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "member",
      where: [
        {
          field: "organizationId",
          value: organization.authOrganizationId,
        },
        {
          field: "userId",
          value: authUser._id,
        },
      ],
    });
    if (!member) {
      return null;
    }
    return {
      authUser,
      organization,
      role: normalizeWorkspaceRole(member.role),
      authMemberId: member._id,
    };
  }

  const legacyMember = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organizationId_and_userId", (q) =>
      q.eq("organizationId", organizationId).eq("userId", authUser._id)
    )
    .unique();
  if (!legacyMember) {
    return null;
  }
  return {
    authUser,
    organization,
    role: legacyMember.role,
    authMemberId: legacyMember.authMemberId,
  };
}

export async function requireWorkspaceMember(
  ctx: WorkspaceCtx,
  organizationId: Id<"organizations">
): Promise<WorkspaceAccess> {
  const access = await getWorkspaceAccess(ctx, organizationId);
  if (!access) {
    throw new Error("Not a member of this organization");
  }
  return access;
}

export async function requireWorkspaceAdmin(
  ctx: WorkspaceCtx,
  organizationId: Id<"organizations">
): Promise<WorkspaceAccess> {
  const access = await requireWorkspaceMember(ctx, organizationId);
  if (access.role === "member") {
    throw new Error("Insufficient permissions");
  }
  return access;
}

export async function requireWorkspaceOwner(
  ctx: WorkspaceCtx,
  organizationId: Id<"organizations">
): Promise<WorkspaceAccess> {
  const access = await requireWorkspaceMember(ctx, organizationId);
  if (access.role !== "owner") {
    throw new Error("Only the organization owner can perform this action");
  }
  return access;
}

/** Authorize an organization-owned resource or a personal resource owned by the caller. */
export async function requirePersonalOrWorkspaceAccess(
  ctx: WorkspaceCtx,
  resource: {
    organizationId?: Id<"organizations"> | null;
    userId?: string | null;
  }
): Promise<Awaited<ReturnType<typeof authComponent.getAuthUser>>> {
  const authUser = await getAuthUserOrThrow(ctx);
  if (resource.organizationId) {
    await requireWorkspaceMember(ctx, resource.organizationId);
    return authUser;
  }
  if (resource.userId && resource.userId !== authUser._id) {
    throw new Error("Resource belongs to another user");
  }
  return authUser;
}
