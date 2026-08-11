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
  const backend = convexTest(schema, modules);
  backend.registerComponent("betterAuth", authSchema, betterAuthModules);
  return backend;
}

async function createAuthenticatedUser(backend: ReturnType<typeof createTestBackend>) {
  const now = Date.now();
  const authUser = (await backend.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "user",
      data: {
        name: "Workspace administrator",
        email: "workspace-admin@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    },
  })) as { _id: string };
  const session = (await backend.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "session",
      data: {
        token: "organization-config-session",
        userId: authUser._id,
        expiresAt: now + 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      },
    },
  })) as { _id: string };

  await backend.run((ctx) =>
    ctx.db.insert("users", {
      authUserId: authUser._id,
      name: "Workspace administrator",
      email: "workspace-admin@example.com",
    }),
  );

  return {
    authUserId: authUser._id,
    client: backend.withIdentity({
      subject: authUser._id,
      sessionId: session._id,
      tokenIdentifier: `test|${authUser._id}`,
    }),
  };
}

async function seedOrganization(
  backend: ReturnType<typeof createTestBackend>,
  authUserId: string,
  slug: string,
) {
  return await backend.run(async (ctx) => {
    const organizationId = await ctx.db.insert("organizations", {
      name: slug,
      slug,
      ownerId: authUserId,
      createdAt: Date.now(),
      status: "active",
    });
    const roleId = await ctx.db.insert("roles", {
      organizationId,
      key: "admin",
      name: "Admin",
      description: `${slug} administrator`,
      permissions: ["manage_roles", "manage_version_control"],
    });
    await ctx.db.insert("organizationMembers", {
      organizationId,
      userId: authUserId,
      userName: "Workspace administrator",
      userEmail: "workspace-admin@example.com",
      role: "admin",
      roleId,
      joinedAt: Date.now(),
    });
    return organizationId;
  });
}

function projectInput(name: string, organizationId?: Id<"organizations">) {
  return {
    name,
    version: "V1",
    status: "Draft" as const,
    lead: "Workspace administrator",
    description: `${name} formulation`,
    ingredients: [],
    ...(organizationId ? { organizationId } : {}),
  };
}

describe("organization-scoped workspace configuration", () => {
  test("stores and returns separate settings for each organization", async () => {
    const backend = createTestBackend();
    const { authUserId, client } = await createAuthenticatedUser(backend);
    const firstOrganizationId = await seedOrganization(backend, authUserId, "first-workspace");
    const secondOrganizationId = await seedOrganization(backend, authUserId, "second-workspace");

    await client.mutation(api.systemConfig.updateTraceabilityConfig, {
      organizationId: firstOrganizationId,
      idPrefix: "FIRST-",
      currentIdNumber: 12,
    });
    await client.mutation(api.systemConfig.updateTraceabilityConfig, {
      organizationId: secondOrganizationId,
      idPrefix: "SECOND-",
      currentIdNumber: 34,
    });
    await client.mutation(api.systemConfig.updateVersionControlConfig, {
      organizationId: firstOrganizationId,
      versionPrefix: "R",
      versionStyle: "single",
      autoIncrementVersion: true,
    });
    await client.mutation(api.systemConfig.updateVersionControlConfig, {
      organizationId: secondOrganizationId,
      versionPrefix: "S",
      versionStyle: "major-minor",
      autoIncrementVersion: false,
    });

    await expect(
      client.query(api.systemConfig.getTraceabilityConfig, {
        organizationId: firstOrganizationId,
      }),
    ).resolves.toMatchObject({ idPrefix: "FIRST-", currentIdNumber: 12 });
    await expect(
      client.query(api.systemConfig.getTraceabilityConfig, {
        organizationId: secondOrganizationId,
      }),
    ).resolves.toMatchObject({ idPrefix: "SECOND-", currentIdNumber: 34 });
    await expect(
      client.query(api.systemConfig.getVersionControlConfig, {
        organizationId: firstOrganizationId,
      }),
    ).resolves.toMatchObject({
      versionPrefix: "R",
      versionStyle: "single",
      autoIncrementVersion: true,
    });
    await expect(
      client.query(api.systemConfig.getVersionControlConfig, {
        organizationId: secondOrganizationId,
      }),
    ).resolves.toMatchObject({
      versionPrefix: "S",
      versionStyle: "major-minor",
      autoIncrementVersion: false,
    });
  });

  test("applies settings only to projects in the configured organization", async () => {
    const backend = createTestBackend();
    const { authUserId, client } = await createAuthenticatedUser(backend);
    const firstOrganizationId = await seedOrganization(backend, authUserId, "first-projects");
    const secondOrganizationId = await seedOrganization(backend, authUserId, "second-projects");
    const migratingOrganizationId = await seedOrganization(
      backend,
      authUserId,
      "migrating-projects",
    );

    await client.mutation(api.systemConfig.updateTraceabilityConfig, {
      organizationId: firstOrganizationId,
      idPrefix: "A-",
      currentIdNumber: 7,
    });
    await client.mutation(api.systemConfig.updateTraceabilityConfig, {
      organizationId: secondOrganizationId,
      idPrefix: "B-",
      currentIdNumber: 40,
    });
    await client.mutation(api.systemConfig.updateVersionControlConfig, {
      organizationId: firstOrganizationId,
      versionPrefix: "R",
      versionStyle: "single",
      autoIncrementVersion: true,
    });
    await client.mutation(api.systemConfig.updateVersionControlConfig, {
      organizationId: secondOrganizationId,
      versionPrefix: "S",
      versionStyle: "single",
      autoIncrementVersion: false,
    });
    await backend.run(async (ctx) => {
      await ctx.db.insert("systemConfig", {
        configKey: "traceability",
        idPrefix: "GLOBAL-",
        currentIdNumber: 900,
      });
      await ctx.db.insert("systemConfig", {
        configKey: "versionControl",
        versionPrefix: "G",
        versionStyle: "single",
        autoIncrementVersion: true,
      });
    });

    const firstProjectId = await client.mutation(
      api.projects.create,
      projectInput("First project", firstOrganizationId),
    );
    const secondProjectId = await client.mutation(
      api.projects.create,
      projectInput("Second project", secondOrganizationId),
    );
    const migratingProjectId = await client.mutation(
      api.projects.create,
      projectInput("Migrating project", migratingOrganizationId),
    );
    const personalProjectId = await client.mutation(api.projects.create, {
      ...projectInput("Personal project"),
      batchCodePrefix: "MANUAL",
    });

    const createdProjects = await backend.run(async (ctx) => ({
      first: await ctx.db.get(firstProjectId),
      second: await ctx.db.get(secondProjectId),
      migrating: await ctx.db.get(migratingProjectId),
      personal: await ctx.db.get(personalProjectId),
    }));
    expect(createdProjects.first?.batchCodePrefix).toBe("A-007");
    expect(createdProjects.second?.batchCodePrefix).toBe("B-040");
    expect(createdProjects.migrating?.batchCodePrefix).toBe("GLOBAL-900");
    expect(createdProjects.personal?.batchCodePrefix).toBe("MANUAL");

    const traceabilityCounters = await backend.run(async (ctx) => ({
      legacy: await ctx.db
        .query("systemConfig")
        .withIndex("by_organizationId_and_configKey", (q) =>
          q.eq("organizationId", undefined).eq("configKey", "traceability"),
        )
        .unique(),
      migrating: await ctx.db
        .query("systemConfig")
        .withIndex("by_organizationId_and_configKey", (q) =>
          q.eq("organizationId", migratingOrganizationId).eq("configKey", "traceability"),
        )
        .unique(),
    }));
    expect(traceabilityCounters.legacy?.currentIdNumber).toBe(900);
    expect(traceabilityCounters.migrating?.currentIdNumber).toBe(901);

    await client.mutation(api.projects.update, { id: firstProjectId, status: "Approved" });
    await client.mutation(api.projects.update, { id: secondProjectId, status: "Approved" });
    await client.mutation(api.projects.update, { id: migratingProjectId, status: "Approved" });
    await client.mutation(api.projects.update, { id: personalProjectId, status: "Approved" });

    const approvedProjects = await backend.run(async (ctx) => ({
      first: await ctx.db.get(firstProjectId),
      second: await ctx.db.get(secondProjectId),
      migrating: await ctx.db.get(migratingProjectId),
      personal: await ctx.db.get(personalProjectId),
    }));
    expect(approvedProjects.first?.version).toBe("R2");
    expect(approvedProjects.second?.version).toBe("V1");
    expect(approvedProjects.migrating?.version).toBe("G2");
    expect(approvedProjects.personal?.version).toBe("V1");
  });
});
