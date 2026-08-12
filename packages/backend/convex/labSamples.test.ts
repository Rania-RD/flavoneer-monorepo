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

async function seedWorkspace(backend: ReturnType<typeof createTestBackend>) {
  const now = Date.now();
  const authUser = (await backend.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "user",
      data: {
        name: "Quality Officer",
        email: "quality@example.com",
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
        token: "quality-session-token",
        userId: authUser._id,
        expiresAt: now + 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      },
    },
  })) as { _id: string };

  const seeded = await backend.run(async (ctx) => {
    const organizationId = await ctx.db.insert("organizations", {
      name: "Sample workspace",
      slug: "sample-workspace",
      ownerId: authUser._id,
      createdAt: now,
      status: "active",
    });
    const roleId = await ctx.db.insert("roles", {
      organizationId,
      key: "quality_officer",
      name: "Quality Officer",
      description: "Lab sample test role",
      permissions: ["record_production_checks", "view_production_checks"],
    });
    await ctx.db.insert("users", {
      authUserId: authUser._id,
      name: "Quality Officer",
      email: "quality@example.com",
    });
    await ctx.db.insert("organizationMembers", {
      organizationId,
      userId: authUser._id,
      userName: "Quality Officer",
      userEmail: "quality@example.com",
      role: "member",
      roleId,
      joinedAt: now,
    });
    await ctx.db.insert("productionLineSettings", {
      organizationId,
      timezone: "Asia/Gaza",
      enabledHallCodes: ["A"],
      updatedAt: now,
      updatedBy: authUser._id,
    });
    const ingredientId = await ctx.db.insert("ingredients", {
      name: "Cocoa butter",
      yieldAmount: 100,
      moistureLoss: 0,
      organizationId,
    });
    const projectId = await ctx.db.insert("projects", {
      name: "Dark chocolate",
      version: "1.0",
      status: "Released",
      lead: "R&D",
      description: "Finished product",
      ingredients: [],
      organizationId,
    });
    return { ingredientId, organizationId, projectId };
  });

  return {
    ...seeded,
    client: backend.withIdentity({
      subject: authUser._id,
      sessionId: session._id,
      tokenIdentifier: `test|${authUser._id}`,
    }),
  };
}

describe("lab sample submissions", () => {
  test("allocates separate yearly sequences and stores traceability data", async () => {
    const backend = createTestBackend();
    const { client, ingredientId, organizationId, projectId } = await seedWorkspace(backend);
    const sampledAt = Date.parse("2025-12-31T22:30:00.000Z");

    const firstRaw = await client.mutation(api.labSamples.create, {
      organizationId,
      product: { sampleType: "raw_material", ingredientId },
      productionNumber: "290726 1",
      sampleLocation: "Raw material store",
      sampledAt,
      notes: "Keep chilled",
    });
    const secondRaw = await client.mutation(api.labSamples.create, {
      organizationId,
      product: { sampleType: "raw_material", ingredientId },
      productionNumber: "2907261",
      sampleLocation: "Line A",
      sampledAt,
    });
    const firstFinished = await client.mutation(api.labSamples.create, {
      organizationId,
      product: { sampleType: "final_product", projectId },
      productionNumber: "2907261",
      sampleLocation: "Packing line",
      sampledAt,
    });

    expect(firstRaw.sampleNumber).toBe("R26001");
    expect(secondRaw.sampleNumber).toBe("R26002");
    expect(firstFinished.sampleNumber).toBe("F260001");
    await expect(client.query(api.labSamples.listRecent, { organizationId })).resolves.toEqual([
      expect.objectContaining({
        sampleNumber: "F260001",
        productName: "Dark chocolate",
        productionNumber: "2907261",
      }),
      expect.objectContaining({ sampleNumber: "R26002" }),
      expect.objectContaining({
        sampleNumber: "R26001",
        productName: "Cocoa butter",
        notes: "Keep chilled",
      }),
    ]);
  });

  test("rejects a product from another workspace", async () => {
    const backend = createTestBackend();
    const { client, organizationId } = await seedWorkspace(backend);
    const foreignIngredientId = await backend.run((ctx) =>
      ctx.db.insert("ingredients", {
        name: "Foreign material",
        yieldAmount: 100,
        moistureLoss: 0,
      }),
    );

    await expect(
      client.mutation(api.labSamples.create, {
        organizationId,
        product: {
          sampleType: "raw_material",
          ingredientId: foreignIngredientId as Id<"ingredients">,
        },
        productionNumber: "2907261",
        sampleLocation: "Store",
        sampledAt: Date.parse("2026-07-29T10:00:00.000Z"),
      }),
    ).rejects.toThrow("Selected product does not belong to this workspace");
  });
});
