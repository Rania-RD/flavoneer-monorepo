import { expect, test } from "@playwright/test";
import {
  getVisibleWorkspaceSettingsTabs,
  resolveWorkspaceSettingsTab,
} from "../lib/workspace-settings-access";

test.describe("workspace settings access policy", () => {
  test("shows role management only to Admin users", () => {
    expect(
      getVisibleWorkspaceSettingsTabs({
        canManageVersionControl: false,
        isAdmin: true,
      })
    ).toContain("roles");
    expect(
      getVisibleWorkspaceSettingsTabs({
        canManageVersionControl: true,
        isAdmin: false,
      })
    ).not.toContain("roles");
  });

  test("shows version control only with its dedicated permission", () => {
    expect(
      getVisibleWorkspaceSettingsTabs({
        canManageVersionControl: true,
        isAdmin: false,
      })
    ).toContain("versionControl");
    expect(
      getVisibleWorkspaceSettingsTabs({
        canManageVersionControl: false,
        isAdmin: true,
      })
    ).not.toContain("versionControl");
  });

  test("rejects direct navigation to unauthorized tabs", () => {
    expect(
      resolveWorkspaceSettingsTab("roles", {
        canManageVersionControl: true,
        isAdmin: false,
      })
    ).toBe("appearance");
    expect(
      resolveWorkspaceSettingsTab("versionControl", {
        canManageVersionControl: false,
        isAdmin: true,
      })
    ).toBe("appearance");
  });
});
