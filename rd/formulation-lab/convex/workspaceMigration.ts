import { v } from "convex/values";
import { query } from "./_generated/server";
import { requirePermission } from "./permissions";

const inventoryItemValidator = v.object({
  teamId: v.id("teams"),
  name: v.string(),
  authOrganizationId: v.optional(v.string()),
  ownerCount: v.number(),
  memberCount: v.number(),
  pendingInviteCount: v.number(),
  legacyPendingInviteCount: v.number(),
  projectCount: v.number(),
  capped: v.boolean(),
  issues: v.array(v.string()),
});

/** Authenticated, bounded preflight report for the organization backfill. */
export const inventory = query({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    workspaces: v.array(inventoryItemValidator),
    complete: v.boolean(),
    sampleLimit: v.number(),
  }),
  handler: async (ctx, args) => {
    await requirePermission(ctx, "manage_roles");
    const sampleLimit = Math.min(Math.max(args.limit ?? 100, 1), 100);
    const teams = await ctx.db.query("teams").take(sampleLimit + 1);
    const workspaces = await Promise.all(
      teams.slice(0, sampleLimit).map(async (team) => {
        const members = await ctx.db
          .query("teamMembers")
          .withIndex("by_teamId", (q) => q.eq("teamId", team._id))
          .take(101);
        const invites = await ctx.db
          .query("teamInvites")
          .withIndex("by_teamId", (q) => q.eq("teamId", team._id))
          .take(101);
        const projects = await ctx.db
          .query("projects")
          .withIndex("by_teamId", (q) => q.eq("teamId", team._id))
          .take(101);
        const ownerCount = members.filter(
          (member) => member.role === "owner"
        ).length;
        const pendingInvites = invites.filter(
          (invite) => invite.status === "pending"
        );
        const issues: string[] = [];
        if (ownerCount !== 1) {
          issues.push("owner_count");
        }
        if (members.length > 100) {
          issues.push("membership_limit");
        }
        if (
          members.some(
            (member, index) =>
              members.findIndex(
                (candidate) => candidate.userId === member.userId
              ) !== index
          )
        ) {
          issues.push("duplicate_member");
        }

        return {
          teamId: team._id,
          name: team.name,
          authOrganizationId: team.authOrganizationId,
          ownerCount,
          memberCount: Math.min(members.length, 100),
          pendingInviteCount: Math.min(pendingInvites.length, 100),
          legacyPendingInviteCount: pendingInvites.filter(
            (invite) => !invite.authInvitationId
          ).length,
          projectCount: Math.min(projects.length, 100),
          capped:
            members.length > 100 ||
            invites.length > 100 ||
            projects.length > 100,
          issues,
        };
      })
    );

    return {
      workspaces,
      complete: teams.length <= sampleLimit,
      sampleLimit,
    };
  },
});

/** Reports remaining unbound workspaces after the migration runner completes. */
export const verify = query({
  args: {},
  returns: v.object({
    complete: v.boolean(),
    remainingTeamIds: v.array(v.id("teams")),
    checked: v.number(),
  }),
  handler: async (ctx) => {
    await requirePermission(ctx, "manage_roles");
    const teams = await ctx.db.query("teams").take(101);
    const remainingTeamIds = teams
      .filter((team) => !team.authOrganizationId)
      .map((team) => team._id);
    return {
      complete: teams.length <= 100 && remainingTeamIds.length === 0,
      remainingTeamIds,
      checked: Math.min(teams.length, 100),
    };
  },
});
