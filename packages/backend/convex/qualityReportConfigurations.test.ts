/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, components } from "./_generated/api";
import authSchema from "./betterAuth/schema";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const betterAuthModules = import.meta.glob("./betterAuth/**/*.ts");

function createTestBackend() {
  const backend = convexTest(schema, modules);
  backend.registerComponent("betterAuth", authSchema, betterAuthModules);
  return backend;
}

async function createWorkspace(backend: ReturnType<typeof createTestBackend>) {
  const now = Date.now();
  const authUser = (await backend.mutation(components.betterAuth.adapter.create, {
    input: {
      data: {
        createdAt: now,
        email: "quality-manager@example.com",
        emailVerified: true,
        name: "Quality manager",
        updatedAt: now,
      },
      model: "user",
    },
  })) as { _id: string };
  const session = (await backend.mutation(components.betterAuth.adapter.create, {
    input: {
      data: {
        createdAt: now,
        expiresAt: now + 60 * 60 * 1000,
        token: "quality-report-config-session",
        updatedAt: now,
        userId: authUser._id,
      },
      model: "session",
    },
  })) as { _id: string };

  await backend.run((ctx) =>
    ctx.db.insert("users", {
      authUserId: authUser._id,
      email: "quality-manager@example.com",
      name: "Quality manager",
    }),
  );

  const createOrganization = async (slug: string) =>
    await backend.run(async (ctx) => {
      const organizationId = await ctx.db.insert("organizations", {
        createdAt: now,
        name: slug,
        ownerId: authUser._id,
        slug,
        status: "active",
      });
      await ctx.db.insert("organizationMembers", {
        joinedAt: now,
        organizationId,
        role: "owner",
        userEmail: "quality-manager@example.com",
        userId: authUser._id,
        userName: "Quality manager",
      });
      return organizationId;
    });

  return {
    client: backend.withIdentity({
      sessionId: session._id,
      subject: authUser._id,
      tokenIdentifier: `test|${authUser._id}`,
    }),
    firstOrganizationId: await createOrganization("first-factory"),
    secondOrganizationId: await createOrganization("second-factory"),
  };
}

const configuredSections = [
  { key: "laboratory", labelI18n: { en: "Lab release" }, visible: true },
  { key: "summary", labelI18n: { ar: "ملخص المصنع" }, visible: true },
  { key: "operations", labelI18n: {}, visible: false },
  { key: "quality", labelI18n: {}, visible: true },
  { key: "readiness", labelI18n: {}, visible: true },
  { key: "comparison", labelI18n: {}, visible: true },
  { key: "workflow", labelI18n: {}, visible: true },
] as const;

describe("quality report section configuration", () => {
  test("persists order, visibility, and localized labels per organization", async () => {
    const backend = createTestBackend();
    const { client, firstOrganizationId, secondOrganizationId } = await createWorkspace(backend);

    await client.mutation(api.qualityReportConfigurations.upsert, {
      organizationId: firstOrganizationId,
      sections: [...configuredSections],
    });

    await expect(
      client.query(api.qualityReportConfigurations.get, {
        organizationId: firstOrganizationId,
      }),
    ).resolves.toMatchObject({ sections: configuredSections });
    const untouched = await client.query(api.qualityReportConfigurations.get, {
      organizationId: secondOrganizationId,
    });
    expect(untouched.sections.map(({ key }) => key)).toEqual([
      "summary",
      "operations",
      "quality",
      "readiness",
      "comparison",
      "workflow",
      "laboratory",
    ]);
    expect(untouched.sections.every(({ visible }) => visible)).toBe(true);
  });

  test("rejects duplicate sections and configurations with no visible section", async () => {
    const backend = createTestBackend();
    const { client, firstOrganizationId } = await createWorkspace(backend);

    await expect(
      client.mutation(api.qualityReportConfigurations.upsert, {
        organizationId: firstOrganizationId,
        sections: configuredSections.map((section) => ({
          ...section,
          visible: false,
        })),
      }),
    ).rejects.toThrow("At least one report section");
    await expect(
      client.mutation(api.qualityReportConfigurations.upsert, {
        organizationId: firstOrganizationId,
        sections: configuredSections.map((section, index) => ({
          ...section,
          key: index === 1 ? "laboratory" : section.key,
        })),
      }),
    ).rejects.toThrow("exactly once");
  });
});
