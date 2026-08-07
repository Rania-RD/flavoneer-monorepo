import {
  getEffectiveSystemPermissions,
  isConfigurableSystemRole,
  resolveSystemRoleId,
  systemRoleHasPermission,
} from "@flavoneer/backend/system-role-access";
import { expect, test } from "@playwright/test";

test.describe("admin system permissions", () => {
  test("grants full access to an admin with a legacy permission list", () => {
    const adminRole = {
      key: "admin",
      permissions: ["execute_runs"],
    };

    expect(getEffectiveSystemPermissions(adminRole)).toContain("full_access");
    expect(systemRoleHasPermission(adminRole, "manage_roles")).toBe(true);
  });

  test("does not grant unassigned permissions to a non-admin", () => {
    expect(
      systemRoleHasPermission(
        { key: "operator", permissions: ["execute_runs"] },
        "manage_roles"
      )
    ).toBe(false);
  });

  test("keeps Admin fixed while allowing other roles in the permissions matrix", () => {
    expect(isConfigurableSystemRole({ key: "admin" })).toBe(false);
    expect(isConfigurableSystemRole({ key: "supervisor" })).toBe(true);
  });
});

test.describe("organization-owner system access", () => {
  test("requires the Admin role for an organization owner", () => {
    expect(
      resolveSystemRoleId({
        adminRoleId: "admin-id",
        currentRoleId: "operator-id",
        defaultRoleId: "operator-id",
        ownsOrganization: true,
      })
    ).toBe("admin-id");
  });

  test("preserves the assigned role for a user who does not own an organization", () => {
    expect(
      resolveSystemRoleId({
        adminRoleId: "admin-id",
        currentRoleId: "editor-id",
        defaultRoleId: "operator-id",
        ownsOrganization: false,
      })
    ).toBe("editor-id");
  });
});
