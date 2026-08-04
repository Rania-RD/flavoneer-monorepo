import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { createAuth } from "./auth";

export const migrations = new Migrations<DataModel>(components.migrations);

export const attachBetterAuthOrganizations = migrations.define({
  table: "teams",
  batchSize: 1,
  migrateOne: async (ctx, team) => {
    if (team.authOrganizationId) {
      return;
    }

    const localMembers = await ctx.db
      .query("teamMembers")
      .withIndex("by_teamId", (q) => q.eq("teamId", team._id))
      .take(101);
    if (localMembers.length > 100) {
      throw new Error(
        `Workspace ${team._id} exceeds the Better Auth membership limit`
      );
    }
    const pendingInvites = (
      await ctx.db
        .query("teamInvites")
        .withIndex("by_teamId", (q) => q.eq("teamId", team._id))
        .take(101)
    ).filter((invite) => invite.status === "pending");
    if (pendingInvites.length > 100) {
      throw new Error(
        `Workspace ${team._id} exceeds the Better Auth invitation limit`
      );
    }

    const auth = createAuth(ctx);
    const existingOrganization = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "organization",
        where: [{ field: "slug", value: team.slug }],
      }
    );
    const organization =
      existingOrganization ??
      (await auth.api.createOrganization({
        body: {
          name: team.name,
          slug: team.slug,
          userId: team.ownerId,
          keepCurrentActiveOrganization: true,
        },
      }));

    await ctx.db.patch(team._id, {
      authOrganizationId: organization._id ?? organization.id,
    });
    const authOrganizationId = organization._id ?? organization.id;

    for (const localMember of localMembers) {
      const existingMember = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "member",
          where: [
            { field: "organizationId", value: authOrganizationId },
            { field: "userId", value: localMember.userId },
          ],
        }
      );
      const authMember =
        existingMember ??
        (await auth.api.addMember({
          body: {
            userId: localMember.userId,
            role: localMember.role,
            organizationId: authOrganizationId,
          },
        }));

      await ctx.db.patch(localMember._id, {
        authMemberId: authMember._id ?? authMember.id,
      });
    }

    for (const pendingInvite of pendingInvites) {
      if (pendingInvite.authInvitationId) {
        continue;
      }

      const existingInvitation = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "invitation",
          where: [
            { field: "organizationId", value: authOrganizationId },
            { field: "email", value: pendingInvite.email.toLowerCase() },
            { field: "status", value: "pending" },
          ],
        }
      );
      const authInvitation =
        existingInvitation ??
        (await ctx.runMutation(components.betterAuth.adapter.create, {
          input: {
            model: "invitation",
            data: {
              organizationId: authOrganizationId,
              email: pendingInvite.email.toLowerCase(),
              role: pendingInvite.role,
              status: "pending",
              expiresAt: Date.now() + 48 * 60 * 60 * 1000,
              createdAt: Date.now(),
              inviterId: pendingInvite.invitedBy,
            },
          },
        }));
      const authInvitationId = authInvitation._id ?? authInvitation.id;

      await ctx.db.patch(pendingInvite._id, {
        authInvitationId,
        token: authInvitationId,
        createdAt: authInvitation.createdAt,
        expiresAt: authInvitation.expiresAt,
      });
    }
  },
});

export const run = migrations.runner();
