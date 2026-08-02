import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, query } from "./_generated/server";
import { teamAuditLogReturnValidator } from "./validators";
import { requireWorkspaceMember } from "./workspaceAccess";

/**
 * Internal helper — insert an audit log entry.
 * Called from other team mutation files, not exposed to the client directly.
 */
export async function logTeamAction(
  ctx: MutationCtx,
  args: {
    teamId: Id<"teams">;
    actorId: string;
    actorName: string;
    action: string;
    targetType?: string;
    targetId?: string;
    targetLabel?: string;
    meta?: Record<string, string>;
  }
) {
  await ctx.db.insert("teamAuditLogs", {
    teamId: args.teamId,
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
 * List audit logs for a team. Caller must be a member.
 */
export const list = query({
  args: {
    teamId: v.id("teams"),
  },
  returns: v.array(teamAuditLogReturnValidator),
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.teamId);

    return await ctx.db
      .query("teamAuditLogs")
      .withIndex("by_teamId", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .take(200);
  },
});
