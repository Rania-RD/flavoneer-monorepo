import { expect, test } from "@playwright/test";
import {
  getVisibleOrganizationSettingsTabs,
  resolveOrganizationSettingsTab,
} from "../lib/organization-settings-access";

test.describe("organization settings access policy", () => {
  test("places production-line settings in organization settings for managers", () => {
    expect(
      getVisibleOrganizationSettingsTabs({ canManageProductionLine: true })
    ).toEqual(["members", "invites", "auditLog", "productionLine", "settings"]);
  });

  test("hides production-line settings from users without access", () => {
    expect(
      getVisibleOrganizationSettingsTabs({ canManageProductionLine: false })
    ).toEqual(["members", "invites", "auditLog", "settings"]);
    expect(
      resolveOrganizationSettingsTab("productionLine", {
        canManageProductionLine: false,
      })
    ).toBe("members");
  });
});
