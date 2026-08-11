import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireSuperAdmin } from "./superAdminAccess";

const inventoryItemValidator = v.object({
  organizationId: v.id("organizations"),
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
    await requireSuperAdmin(ctx);
    const sampleLimit = Math.min(Math.max(args.limit ?? 100, 1), 100);
    const organizations = await ctx.db.query("organizations").take(sampleLimit + 1);
    const workspaces = await Promise.all(
      organizations.slice(0, sampleLimit).map(async (organization) => {
        const members = await ctx.db
          .query("organizationMembers")
          .withIndex("by_organizationId", (q) => q.eq("organizationId", organization._id))
          .take(101);
        const invites = await ctx.db
          .query("organizationInvites")
          .withIndex("by_organizationId", (q) => q.eq("organizationId", organization._id))
          .take(101);
        const projects = await ctx.db
          .query("projects")
          .withIndex("by_organizationId", (q) => q.eq("organizationId", organization._id))
          .take(101);
        const ownerCount = members.filter((member) => member.role === "owner").length;
        const pendingInvites = invites.filter((invite) => invite.status === "pending");
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
              members.findIndex((candidate) => candidate.userId === member.userId) !== index,
          )
        ) {
          issues.push("duplicate_member");
        }

        return {
          organizationId: organization._id,
          name: organization.name,
          authOrganizationId: organization.authOrganizationId,
          ownerCount,
          memberCount: Math.min(members.length, 100),
          pendingInviteCount: Math.min(pendingInvites.length, 100),
          legacyPendingInviteCount: pendingInvites.filter((invite) => !invite.authInvitationId)
            .length,
          projectCount: Math.min(projects.length, 100),
          capped: members.length > 100 || invites.length > 100 || projects.length > 100,
          issues,
        };
      }),
    );

    return {
      workspaces,
      complete: organizations.length <= sampleLimit,
      sampleLimit,
    };
  },
});

/** Reports remaining unbound workspaces after the migration runner completes. */
export const verify = query({
  args: {},
  returns: v.object({
    complete: v.boolean(),
    remainingOrganizationIds: v.array(v.id("organizations")),
    checked: v.number(),
  }),
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    const organizations = await ctx.db.query("organizations").take(101);
    const remainingOrganizationIds = organizations
      .filter((organization) => !organization.authOrganizationId)
      .map((organization) => organization._id);
    return {
      complete: organizations.length <= 100 && remainingOrganizationIds.length === 0,
      remainingOrganizationIds,
      checked: Math.min(organizations.length, 100),
    };
  },
});
