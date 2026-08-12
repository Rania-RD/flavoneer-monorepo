import { expect, test } from "@playwright/test";
import {
  getVisibleOrganizationSettingsTabs,
  resolveOrganizationSettingsTab,
} from "../lib/organization-settings-access";

test.describe("organization settings access policy", () => {
  test("places former workspace settings in organization settings", () => {
    expect(
      getVisibleOrganizationSettingsTabs({
        canManageProductionLine: true,
        canManageVersionControl: true,
        isAdmin: true,
      })
    ).toEqual([
      "members",
      "invites",
      "auditLog",
      "traceability",
      "roles",
      "versionControl",
      "productionLine",
      "settings",
    ]);
  });

  test("hides permission-controlled settings from users without access", () => {
    expect(
      getVisibleOrganizationSettingsTabs({
        canManageProductionLine: false,
        canManageVersionControl: false,
        isAdmin: false,
      })
    ).toEqual(["members", "invites", "auditLog", "traceability", "settings"]);
    expect(
      resolveOrganizationSettingsTab("productionLine", {
        canManageProductionLine: false,
        canManageVersionControl: false,
        isAdmin: false,
      })
    ).toBe("members");
    expect(
      resolveOrganizationSettingsTab("roles", {
        canManageProductionLine: false,
        canManageVersionControl: true,
        isAdmin: false,
      })
    ).toBe("members");
    expect(
      resolveOrganizationSettingsTab("versionControl", {
        canManageProductionLine: false,
        canManageVersionControl: false,
        isAdmin: true,
      })
    ).toBe("members");
  });
});
