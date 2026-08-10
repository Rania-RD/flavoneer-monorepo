import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, query } from "./_generated/server";
import { organizationAuditLogReturnValidator } from "./validators";
import { requireWorkspaceMember } from "./workspaceAccess";

/**
 * Internal helper — insert an audit log entry.
 * Called from other organization mutation files, not exposed to the client directly.
 */
export async function logOrganizationAction(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    actorId: string;
    actorName: string;
    action: string;
    targetType?: string;
    targetId?: string;
    targetLabel?: string;
    meta?: Record<string, string>;
  }
) {
  await ctx.db.insert("organizationAuditLogs", {
    organizationId: args.organizationId,
    actorId: args.actorId,
    actorName: args.actorName,
    action: args.action,
    targetType: args.targetType,
    targetId: args.targetId,
    targetLabel: args.targetLabel,
    meta: args.meta,
    createdAt: Date.now(),
  });
}

/**
 * List audit logs for an organization. Caller must be a member.
 */
export const list = query({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.array(organizationAuditLogReturnValidator),
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.organizationId);

    return await ctx.db
      .query("organizationAuditLogs")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(200);
  },
});
