import { expect, test } from "@playwright/test";
import { resolveSystemRoleId } from "@flavoneer/backend/system-role-access";

test.describe("team-owner system access", () => {
  test("requires the Admin role for a team owner", () => {
    expect(
      resolveSystemRoleId({
        adminRoleId: "admin-id",
        currentRoleId: "operator-id",
        defaultRoleId: "operator-id",
        ownsTeam: true,
      })
    ).toBe("admin-id");
  });

  test("preserves the assigned role for a user who does not own a team", () => {
    expect(
      resolveSystemRoleId({
        adminRoleId: "admin-id",
        currentRoleId: "editor-id",
        defaultRoleId: "operator-id",
        ownsTeam: false,
      })
    ).toBe("editor-id");
  });
});
