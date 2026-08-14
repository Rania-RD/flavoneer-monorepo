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

async function createAuthenticatedUser(backend: ReturnType<typeof createTestBackend>) {
  const now = Date.now();
  const authUser = (await backend.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "user",
      data: {
        name: "Organization member",
        email: "member@example.com",
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
        token: "organization-role-session",
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

async function seedOrganization(
  backend: ReturnType<typeof createTestBackend>,
  authUserId: string,
  slug: string,
  permissions: string[],
) {
  return await backend.run(async (ctx) => {
    const organizationId = await ctx.db.insert("organizations", {
      name: slug,
      slug,
      ownerId: `owner-${slug}`,
      createdAt: Date.now(),
      status: "active",
    });
    const roleId = await ctx.db.insert("roles", {
      organizationId,
      key: permissions.includes("manage_roles") ? "admin" : "operator",
      name: permissions.includes("manage_roles") ? "Admin" : "Operator",
      description: `${slug} role`,
      permissions,
    });
    const memberId = await ctx.db.insert("organizationMembers", {
      organizationId,
      userId: authUserId,
      userName: "Organization member",
      userEmail: "member@example.com",
      role: "member",
      roleId,
      joinedAt: Date.now(),
    });
    return { memberId, organizationId, roleId };
  });
}

describe("organization-scoped roles", () => {
  test.each(["owner", "admin"] as const)(
    "grants full access to an organization %s with a stale Operator assignment",
    async (workspaceRole) => {
      const backend = createTestBackend();
      const { authUserId, client } = await createAuthenticatedUser(backend);
      await backend.run((ctx) => ctx.db.insert("users", { authUserId }));

      const { adminRoleId, memberId, operatorRoleId, organizationId } = await backend.run(
        async (ctx) => {
          const organizationId = await ctx.db.insert("organizations", {
            name: `${workspaceRole}-workspace`,
            slug: `${workspaceRole}-workspace`,
            ownerId: workspaceRole === "owner" ? authUserId : "another-owner",
            createdAt: Date.now(),
            status: "active",
          });
          const adminRoleId = await ctx.db.insert("roles", {
            organizationId,
            key: "admin",
            name: "Admin",
            description: "Legacy administrator",
            permissions: ["execute_runs"],
          });
          const operatorRoleId = await ctx.db.insert("roles", {
            organizationId,
            key: "operator",
            name: "Operator",
            description: "Operator",
            permissions: ["execute_runs"],
          });
          const memberId = await ctx.db.insert("organizationMembers", {
            organizationId,
            userId: authUserId,
            userName: "Organization member",
            userEmail: "member@example.com",
            role: workspaceRole === "owner" ? "member" : "admin",
            roleId: operatorRoleId,
            joinedAt: Date.now(),
          });
          return { adminRoleId, memberId, operatorRoleId, organizationId };
        },
      );

      const currentRole = await client.query(api.users.getCurrentUserRole, { organizationId });
      expect(currentRole?.roleId).toBe(adminRoleId);
      expect(currentRole?.effectivePermissions).toContain("full_access");
      await expect(client.query(api.roles.list, { organizationId })).resolves.toBeDefined();
      await expect(
        client.mutation(api.organizationMembers.updateSystemRole, {
          organizationId,
          memberId,
          newRoleId: operatorRoleId,
        }),
      ).rejects.toThrow("Organization owners and admins must retain the Admin role");
    },
  );

  test("resolves a different role for the same user in each organization", async () => {
    const backend = createTestBackend();
    const { authUserId, client } = await createAuthenticatedUser(backend);
    await backend.run((ctx) =>
      ctx.db.insert("users", {
        authUserId,
        name: "Organization member",
        email: "member@example.com",
      }),
    );
    const first = await seedOrganization(backend, authUserId, "first", ["manage_roles"]);
    const second = await seedOrganization(backend, authUserId, "second", ["execute_runs"]);

    const firstRole = await client.query(api.users.getCurrentUserRole, {
      organizationId: first.organizationId,
    });
    const secondRole = await client.query(api.users.getCurrentUserRole, {
      organizationId: second.organizationId,
    });

    expect(firstRole?.role?._id).toBe(first.roleId);
    expect(firstRole?.effectivePermissions).toContain("manage_roles");
    expect(secondRole?.role?._id).toBe(second.roleId);
    expect(secondRole?.effectivePermissions).toEqual(["execute_runs"]);
    await expect(
      client.query(api.roles.list, { organizationId: second.organizationId }),
    ).rejects.toThrow("Insufficient permissions");
  });

  test("rejects a role update when the target role belongs to another organization", async () => {
    const backend = createTestBackend();
    const { authUserId, client } = await createAuthenticatedUser(backend);
    await backend.run((ctx) => ctx.db.insert("users", { authUserId }));
    const first = await seedOrganization(backend, authUserId, "first-admin", ["manage_roles"]);
    const second = await seedOrganization(backend, authUserId, "second-admin", ["manage_roles"]);

    await expect(
      client.mutation(api.roles.updateRolePermissions, {
        organizationId: first.organizationId,
        roleId: second.roleId,
        permissions: [],
      }),
    ).rejects.toThrow("Role not found");
    await expect(
      client.mutation(api.organizationMembers.updateSystemRole, {
        organizationId: first.organizationId,
        memberId: first.memberId,
        newRoleId: second.roleId,
      }),
    ).rejects.toThrow("Role not found");
    await expect(
      client.mutation(api.organizationMembers.updateSystemRole, {
        organizationId: first.organizationId,
        memberId: second.memberId,
        newRoleId: first.roleId,
      }),
    ).rejects.toThrow("Member not found");

    const unchangedRole = await backend.run((ctx) => ctx.db.get(second.roleId));
    expect(unchangedRole?.permissions).toEqual(["manage_roles"]);
  });

  test("rejects a membership that references a legacy global role", async () => {
    const backend = createTestBackend();
    const { authUserId, client } = await createAuthenticatedUser(backend);
    await backend.run((ctx) => ctx.db.insert("users", { authUserId }));
    const scoped = await seedOrganization(backend, authUserId, "scoped", ["manage_roles"]);
    const legacyRoleId = await backend.run((ctx) =>
      ctx.db.insert("roles", {
        key: "admin",
        name: "Legacy admin",
        description: "Unscoped legacy role",
        permissions: ["full_access"],
      }),
    );
    await backend.run((ctx) => ctx.db.patch(scoped.memberId, { roleId: legacyRoleId }));

    await expect(
      client.query(api.roles.list, { organizationId: scoped.organizationId }),
    ).rejects.toThrow("Role assignment does not belong to this organization");
  });
});
