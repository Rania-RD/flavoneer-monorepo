/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import authSchema from "./betterAuth/schema";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const betterAuthModules = import.meta.glob("./betterAuth/**/*.ts");

function createTestBackend() {
  const t = convexTest(schema, modules);
  t.registerComponent("betterAuth", authSchema, betterAuthModules);
  return t;
}

async function createAuthenticatedUser(t: ReturnType<typeof createTestBackend>, label: string) {
  const now = Date.now();
  const user = (await t.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "user",
      data: {
        name: label,
        email: `${label}@example.com`,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    },
  })) as { _id: string };
  const session = (await t.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "session",
      data: {
        token: `${label}-session-token`,
        userId: user._id,
        expiresAt: now + 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      },
    },
  })) as { _id: string };

  return {
    client: t.withIdentity({
      subject: user._id,
      sessionId: session._id,
      tokenIdentifier: `test|${user._id}`,
    }),
    userId: user._id,
  };
}

async function createProject(
  t: ReturnType<typeof createTestBackend>,
  userId: string,
): Promise<Id<"projects">> {
  return await t.run((ctx) =>
    ctx.db.insert("projects", {
      name: "Secure formulation",
      version: "1.0",
      status: "Draft",
      lead: "Owner",
      description: "Share-link authorization test",
      ingredients: [],
      userId,
      organizationId: null,
    }),
  );
}

describe("shared links", () => {
  test("only an owner can create a typed link and creator identity is canonical", async () => {
    const t = createTestBackend();
    const owner = await createAuthenticatedUser(t, "owner");
    const attacker = await createAuthenticatedUser(t, "attacker");
    const projectId = await createProject(t, owner.userId);

    await expect(
      attacker.client.mutation(api.sharedLinks.createLink, {
        entityId: projectId,
        entityType: "project",
        role: "editor",
      }),
    ).rejects.toThrow("Resource belongs to another user");

    await expect(
      owner.client.mutation(api.sharedLinks.createLink, {
        entityId: projectId,
        entityType: "run",
        role: "viewer",
      }),
    ).rejects.toThrow("Invalid entity ID");

    const token = await owner.client.mutation(api.sharedLinks.createLink, {
      entityId: projectId,
      entityType: "project",
      role: "viewer",
    });
    const link = await t.run((ctx) =>
      ctx.db
        .query("sharedLinks")
        .withIndex("by_token", (q) => q.eq("token", token))
        .unique(),
    );

    expect(link?.createdBy).toBe(owner.userId);
    expect(link?.expiresAt).toBeGreaterThan(link?.createdAt ?? Number.POSITIVE_INFINITY);
  });

  test("viewer is read-only, editor can write, and revocation removes editor access", async () => {
    const t = createTestBackend();
    const owner = await createAuthenticatedUser(t, "owner");
    const viewer = await createAuthenticatedUser(t, "viewer");
    const editor = await createAuthenticatedUser(t, "editor");
    const projectId = await createProject(t, owner.userId);

    const viewerToken = await owner.client.mutation(api.sharedLinks.createLink, {
      entityId: projectId,
      entityType: "project",
      role: "viewer",
    });
    const editorToken = await owner.client.mutation(api.sharedLinks.createLink, {
      entityId: projectId,
      entityType: "project",
      role: "editor",
    });
    await viewer.client.mutation(api.sharedLinks.redeemLink, { token: viewerToken });
    await editor.client.mutation(api.sharedLinks.redeemLink, { token: editorToken });

    await expect(viewer.client.query(api.projects.get, { id: projectId })).resolves.toMatchObject({
      _id: projectId,
      sharedRole: "viewer",
    });
    await expect(
      viewer.client.mutation(api.comments.add, { projectId, text: "viewer write" }),
    ).rejects.toThrow("Editor access required");
    await expect(
      editor.client.mutation(api.comments.add, { projectId, text: "editor write" }),
    ).resolves.toBeDefined();

    await owner.client.mutation(api.sharedLinks.revokeLink, { token: editorToken });
    await expect(
      editor.client.mutation(api.comments.add, { projectId, text: "revoked editor write" }),
    ).rejects.toThrow("Resource belongs to another user or workspace");
    await expect(editor.client.query(api.projects.get, { id: projectId })).resolves.toBeNull();

    const revokedLink = await t.run((ctx) =>
      ctx.db
        .query("sharedLinks")
        .withIndex("by_token", (q) => q.eq("token", editorToken))
        .unique(),
    );
    expect(revokedLink).toMatchObject({
      isActive: false,
      revokedBy: owner.userId,
    });
    expect(revokedLink?.revokedAt).toBeTypeOf("number");
  });

  test("expired and legacy non-expiring links cannot be redeemed", async () => {
    const t = createTestBackend();
    const owner = await createAuthenticatedUser(t, "owner");
    const recipient = await createAuthenticatedUser(t, "recipient");
    const projectId = await createProject(t, owner.userId);
    const token = await owner.client.mutation(api.sharedLinks.createLink, {
      entityId: projectId,
      entityType: "project",
      role: "viewer",
    });

    await t.run(async (ctx) => {
      const link = await ctx.db
        .query("sharedLinks")
        .withIndex("by_token", (q) => q.eq("token", token))
        .unique();
      if (!link) {
        throw new Error("Test link not found");
      }
      await ctx.db.patch(link._id, { expiresAt: Date.now() - 1 });
    });
    await expect(recipient.client.mutation(api.sharedLinks.redeemLink, { token })).rejects.toThrow(
      "Invalid or expired link",
    );

    const legacyToken = "legacy-link-without-expiry";
    await t.run(async (ctx) => {
      await ctx.db.insert("sharedLinks", {
        entityId: projectId,
        entityType: "project",
        token: legacyToken,
        role: "editor",
        createdBy: owner.userId,
        createdAt: Date.now(),
        isActive: true,
      });
    });
    await expect(
      recipient.client.mutation(api.sharedLinks.redeemLink, { token: legacyToken }),
    ).rejects.toThrow("Invalid or expired link");
  });
});
