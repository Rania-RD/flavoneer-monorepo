import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { createAuth } from "./auth";

export const migrations = new Migrations<DataModel>(components.migrations);

export const attachBetterAuthOrganizations = migrations.define({
  table: "organizations",
  batchSize: 1,
  migrateOne: async (ctx, organization) => {
    if (organization.authOrganizationId) {
      return;
    }

    const localMembers = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", organization._id))
      .take(101);
    if (localMembers.length > 100) {
      throw new Error(
        `Organization ${organization._id} exceeds the Better Auth membership limit`,
      );
    }
    const pendingInvites = (
      await ctx.db
        .query("organizationInvites")
        .withIndex("by_organizationId", (q) => q.eq("organizationId", organization._id))
        .take(101)
    ).filter((invite) => invite.status === "pending");
    if (pendingInvites.length > 100) {
      throw new Error(
        `Organization ${organization._id} exceeds the Better Auth invitation limit`,
      );
    }

    const auth = createAuth(ctx);
    const existingOrganization = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: "organization",
        where: [{ field: "slug", value: organization.slug }],
      },
    );
    const authOrganization =
      existingOrganization ??
      (await auth.api.createOrganization({
        body: {
          name: organization.name,
          slug: organization.slug,
          userId: organization.ownerId,
          keepCurrentActiveOrganization: true,
        },
      }));

    const authOrganizationId = authOrganization._id ?? authOrganization.id;
    await ctx.db.patch(organization._id, { authOrganizationId });

    for (const localMember of localMembers) {
      const existingMember = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "member",
          where: [
            { field: "organizationId", value: authOrganizationId },
            { field: "userId", value: localMember.userId },
          ],
        },
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
        },
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
