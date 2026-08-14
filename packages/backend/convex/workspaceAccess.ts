import type { GenericCtx } from "@convex-dev/better-auth";
import { components } from "./_generated/api";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { authComponent } from "./auth";
import { getActiveSharedAccess } from "./sharedAccess";

export type WorkspaceRole = "owner" | "admin" | "member";

type WorkspaceCtx = QueryCtx | MutationCtx;

interface WorkspaceAccess {
  authUser: Awaited<ReturnType<typeof authComponent.getAuthUser>>;
  organization: Doc<"organizations">;
  role: WorkspaceRole;
  authMemberId?: string;
}

export interface AuthorizedResourceScope {
  authUser: NonNullable<Awaited<ReturnType<typeof authComponent.getAuthUser>>>;
  organizationId?: Id<"organizations">;
  userId: string;
}

function normalizeWorkspaceRole(role: string): WorkspaceRole {
  if (role === "owner" || role === "admin") {
    return role;
  }
  return "member";
}

export function workspaceRoleHasFullAccess(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}

export async function getAuthUserOrThrow(
  ctx: GenericCtx<DataModel>,
): Promise<Awaited<ReturnType<typeof authComponent.getAuthUser>>> {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) {
    throw new Error("Not authenticated");
  }
  return authUser;
}

export async function getWorkspaceAccess(
  ctx: WorkspaceCtx,
  organizationId: Id<"organizations">,
): Promise<WorkspaceAccess | null> {
  const authUser = await getAuthUserOrThrow(ctx);
  const organization = await ctx.db.get(organizationId);
  if (!organization) {
    return null;
  }
  if (organization.status === "suspended") {
    throw new Error("This organization is suspended");
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
      role: organization.ownerId === authUser._id ? "owner" : normalizeWorkspaceRole(member.role),
      authMemberId: member._id,
    };
  }

  const legacyMember = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organizationId_and_userId", (q) =>
      q.eq("organizationId", organizationId).eq("userId", authUser._id),
    )
    .unique();
  if (!legacyMember) {
    return null;
  }
  return {
    authUser,
    organization,
    role: organization.ownerId === authUser._id ? "owner" : legacyMember.role,
    authMemberId: legacyMember.authMemberId,
  };
}

export async function requireWorkspaceMember(
  ctx: WorkspaceCtx,
  organizationId: Id<"organizations">,
): Promise<WorkspaceAccess> {
  const access = await getWorkspaceAccess(ctx, organizationId);
  if (!access) {
    throw new Error("Not a member of this organization");
  }
  return access;
}

export async function requireWorkspaceAdmin(
  ctx: WorkspaceCtx,
  organizationId: Id<"organizations">,
): Promise<WorkspaceAccess> {
  const access = await requireWorkspaceMember(ctx, organizationId);
  if (access.role === "member") {
    throw new Error("Insufficient permissions");
  }
  return access;
}

export async function requireWorkspaceOwner(
  ctx: WorkspaceCtx,
  organizationId: Id<"organizations">,
): Promise<WorkspaceAccess> {
  const access = await requireWorkspaceMember(ctx, organizationId);
  if (access.role !== "owner") {
    throw new Error("Only the organization owner can perform this action");
  }
  return access;
}

/** Resolve and authorize the tenant selected by a list or create operation. */
export async function requirePersonalOrWorkspaceScope(
  ctx: WorkspaceCtx,
  organizationId?: Id<"organizations"> | null,
): Promise<AuthorizedResourceScope> {
  const authUser = await getAuthUserOrThrow(ctx);
  if (organizationId) {
    await requireWorkspaceMember(ctx, organizationId);
    return { authUser, organizationId, userId: authUser._id };
  }
  return { authUser, userId: authUser._id };
}

type OwnedResource = {
  _id?: string;
  organizationId?: Id<"organizations"> | null;
  userId?: string | null;
};

/** Authorize only the personal owner or a current workspace member. */
export async function requireOwnerOrWorkspaceAccess(
  ctx: WorkspaceCtx,
  resource: OwnedResource,
): Promise<Awaited<ReturnType<typeof authComponent.getAuthUser>>> {
  const authUser = await getAuthUserOrThrow(ctx);
  if (resource.organizationId) {
    await requireWorkspaceMember(ctx, resource.organizationId);
    return authUser;
  }
  if (!resource.userId) {
    throw new Error("Resource has no owner");
  }
  if (resource.userId !== authUser._id) {
    throw new Error("Resource belongs to another user");
  }
  return authUser;
}

/**
 * Authorize owners, workspace members, or users holding an active editor link.
 * Viewer links remain read-only and cannot pass this helper.
 */
export async function requirePersonalOrWorkspaceAccess(
  ctx: WorkspaceCtx,
  resource: OwnedResource,
): Promise<Awaited<ReturnType<typeof authComponent.getAuthUser>>> {
  const authUser = await getAuthUserOrThrow(ctx);
  if (resource.organizationId) {
    if (await getWorkspaceAccess(ctx, resource.organizationId)) {
      return authUser;
    }
  } else if (resource.userId === authUser._id) {
    return authUser;
  }

  const projectId = resource._id ? ctx.db.normalizeId("projects", resource._id) : null;
  const runId = resource._id ? ctx.db.normalizeId("runs", resource._id) : null;
  const entityId = projectId ?? runId;
  if (entityId) {
    const now = "scheduler" in ctx ? Date.now() : undefined;
    const sharedAccess = await getActiveSharedAccess(ctx, authUser._id, entityId, now);
    if (sharedAccess?.role === "editor") {
      return authUser;
    }
    if (sharedAccess?.role === "viewer") {
      throw new Error("Editor access required");
    }
  }

  if (!resource.organizationId && !resource.userId) {
    throw new Error("Resource has no owner");
  }
  throw new Error("Resource belongs to another user or workspace");
}
