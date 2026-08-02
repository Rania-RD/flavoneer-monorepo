import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { requireActionCtx } from "@convex-dev/better-auth/utils";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { organization } from "better-auth/plugins/organization";
import { v } from "convex/values";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";

const siteUrl = process.env.SITE_URL || "http://localhost:3001";
const authBaseUrl = process.env.BETTER_AUTH_URL || process.env.CONVEX_SITE_URL;
const trustedOrigins = Array.from(
  new Set([siteUrl, "http://localhost:3000", "http://localhost:3001"])
);

const invitationWebhookUrl = process.env.INVITATION_EMAIL_WEBHOOK_URL;
const invitationWebhookSecret = process.env.INVITATION_EMAIL_WEBHOOK_SECRET;

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  {
    local: {
      schema: authSchema,
    },
  }
);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
  ({
    baseURL: authBaseUrl,
    trustedOrigins,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      organization({
        allowUserToCreateOrganization: true,
        organizationLimit: 10,
        membershipLimit: 100,
        invitationLimit: 100,
        invitationExpiresIn: 60 * 60 * 48,
        cancelPendingInvitationsOnReInvite: true,
        requireEmailVerificationOnInvitation: false,
        async sendInvitationEmail(data) {
          if (!invitationWebhookUrl) {
            return;
          }

          requireActionCtx(ctx);
          const inviteUrl = `${siteUrl.replace(/\/$/, "")}/#/invite/${data.id}`;
          const response = await fetch(invitationWebhookUrl, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(invitationWebhookSecret
                ? { authorization: `Bearer ${invitationWebhookSecret}` }
                : {}),
            },
            body: JSON.stringify({
              event: "workspace.invitation.created",
              invitationId: data.id,
              inviteUrl,
              email: data.email,
              role: data.role,
              organization: {
                id: data.organization.id,
                name: data.organization.name,
              },
              inviter: {
                email: data.inviter.user.email,
                name: data.inviter.user.name,
              },
            }),
          });

          if (!response.ok) {
            throw new Error(
              `Invitation webhook failed with status ${response.status}`
            );
          }
        },
      }),
      crossDomain({ siteUrl }),
      convex({ authConfig }),
    ],
  }) satisfies BetterAuthOptions;

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));

// Get the current authenticated user
export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.string(),
      _creationTime: v.number(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerified: v.optional(v.boolean()),
      image: v.optional(v.union(v.string(), v.null())),
      createdAt: v.optional(v.number()),
      updatedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: (ctx) => authComponent.getAuthUser(ctx),
});
