import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export type SharedRole = "viewer" | "editor";

type SharedAccessCtx = QueryCtx | MutationCtx;

/**
 * Resolve a grant only while its source link is active. Grants created before
 * source-link tracking was added are intentionally rejected.
 */
export async function getActiveSharedAccess(
  ctx: SharedAccessCtx,
  userId: string,
  entityId: Id<"projects"> | Id<"runs">,
  now?: number,
) {
  const access = await ctx.db
    .query("sharedAccess")
    .withIndex("by_userId_entityId", (q) => q.eq("userId", userId).eq("entityId", entityId))
    .first();

  if (!access?.sourceLinkId) {
    return null;
  }

  const link = await ctx.db.get(access.sourceLinkId);
  if (
    !link?.isActive ||
    link.revokedAt !== undefined ||
    link.expiredAt !== undefined ||
    link.expiresAt === undefined ||
    link.entityId !== entityId ||
    link.entityType !== access.entityType
  ) {
    return null;
  }
  if (now !== undefined && link.expiresAt <= now) {
    return null;
  }

  const role: SharedRole = access.role === "editor" && link.role === "editor" ? "editor" : "viewer";
  return { ...access, role };
}
