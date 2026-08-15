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

async function createAuthenticatedClient(backend: ReturnType<typeof createTestBackend>) {
  const now = Date.now();
  const authUser = (await backend.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "user",
      data: {
        name: "Inventory Manager",
        email: "inventory@example.com",
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
        token: "inventory-session-token",
        userId: authUser._id,
        expiresAt: now + 60 * 60 * 1000,
        createdAt: now,
        updatedAt: now,
      },
    },
  })) as { _id: string };

  return {
    authUserId: authUser._id,
    client: backend.withIdentity({
      subject: authUser._id,
      sessionId: session._id,
      tokenIdentifier: `test|${authUser._id}`,
    }),
  };
}

describe("inventory component relation", () => {
  test("creates inventory only after an explicit stock batch is added", async () => {
    const backend = createTestBackend();
    const { authUserId, client } = await createAuthenticatedClient(backend);
    const componentId = await client.mutation(api.ingredients.create, {
      name: "Vanilla extract",
      code: "CMP-VANILLA",
      yieldAmount: 100,
      moistureLoss: 0,
    });

    const inventoryAfterComponentCreation = await backend.run((ctx) =>
      ctx.db
        .query("inventoryItems")
        .withIndex("by_componentId", (q) => q.eq("componentId", componentId))
        .collect(),
    );
    expect(inventoryAfterComponentCreation).toEqual([]);

    const explicitBatchId = await client.mutation(api.inventory.create, {
      name: "Vanilla extract",
      description: "Explicitly received stock",
      category: "Flavours",
      batchId: "VANILLA-B1",
      stock: 12,
      unit: "kg",
      expiryDate: "2030-01-01",
      componentId,
    });

    await backend.run((ctx) =>
      ctx.db.insert("inventoryItems", {
        name: "Vanilla extract",
        description: "Legacy generated placeholder",
        category: "Flavours",
        batchId: "COMP-VANILLA",
        stock: 0,
        unit: "kg",
        stockStatus: "low",
        expiryDate: "",
        componentId,
        ingredientId: componentId,
        syncSource: "component_library",
        userId: authUserId,
      }),
    );

    const visibleInventory = await client.query(api.inventory.list, { language: "en" });
    expect(visibleInventory).toHaveLength(1);
    expect(visibleInventory[0]).toMatchObject({
      _id: explicitBatchId,
      batchId: "VANILLA-B1",
      componentId,
    });
  });

  test("lists every library component reactively and persists a newly added relation", async () => {
    const backend = createTestBackend();
    const { authUserId, client } = await createAuthenticatedClient(backend);
    const componentId = await backend.run((ctx) =>
      ctx.db.insert("ingredients", {
        name: "Citrus emulsion",
        nameI18n: { ar: "مستحلب حمضيات", en: "Citrus emulsion" },
        code: "CMP-001",
        status: "Approved",
        yieldAmount: 100,
        moistureLoss: 0,
        userId: authUserId,
      }),
    );
    const initialOptions = await client.query(api.components.list, { language: "en" });
    expect(initialOptions).toEqual([
      expect.objectContaining({ _id: componentId, code: "CMP-001", name: "Citrus emulsion" }),
    ]);

    const draftComponentId = await backend.run((ctx) =>
      ctx.db.insert("ingredients", {
        name: "Draft component",
        code: "CMP-002",
        status: "Draft",
        yieldAmount: 100,
        moistureLoss: 0,
        userId: authUserId,
      }),
    );

    const updatedOptions = await client.query(api.components.list, { language: "en" });
    expect(updatedOptions).toEqual([
      expect.objectContaining({
        _id: draftComponentId,
        code: "CMP-002",
        name: "Draft component",
      }),
      expect.objectContaining({ _id: componentId, code: "CMP-001", name: "Citrus emulsion" }),
    ]);

    const inventoryItemId = await client.mutation(api.inventory.create, {
      name: "Draft component",
      description: "New component batch",
      category: "Emulsifiers",
      batchId: "CMP-001-B1",
      stock: 25,
      unit: "kg",
      expiryDate: "2030-01-01",
      componentId: draftComponentId,
    });
    const inventoryItem = await backend.run((ctx) => ctx.db.get(inventoryItemId));

    expect(inventoryItem).toMatchObject({
      componentId: draftComponentId,
      ingredientId: draftComponentId,
      userId: authUserId,
    });
  });

  test("rejects components outside the authenticated tenant", async () => {
    const backend = createTestBackend();
    const { client } = await createAuthenticatedClient(backend);
    const foreignComponentId = await backend.run((ctx) =>
      ctx.db.insert("ingredients", {
        name: "Foreign component",
        status: "Approved",
        yieldAmount: 100,
        moistureLoss: 0,
        userId: "another-user",
      }),
    );

    await expect(
      client.mutation(api.inventory.create, {
        name: "Foreign component batch",
        description: "Must not be created",
        category: "Bases",
        batchId: "FOREIGN-B1",
        stock: 10,
        unit: "kg",
        expiryDate: "2030-01-01",
        componentId: foreignComponentId,
      }),
    ).rejects.toThrow(/belongs to another user|different workspace/);
  });
});
