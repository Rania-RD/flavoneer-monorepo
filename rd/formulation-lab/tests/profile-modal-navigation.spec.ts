import { expect, test } from "@playwright/test";

const INITIALS_PATTERN = /^(?:\p{L}{1,2}|\?)$/u;
const DARK_CLASS_PATTERN = /dark/;
const SYSTEM_LABEL_PATTERN = /System/;
const USER_SETTINGS_URL_PATTERN = /\/settings\?scope=user/u;

test("profile opens unified settings with nested user, workspace, and organization tabs", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
  await page.goto("/");

  const emailInput = page.locator("#login-email");
  await emailInput.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {
    // An existing authenticated session can proceed directly.
  });

  if (await emailInput.isVisible()) {
    await emailInput.fill("test@example.com");
    await page.locator("#login-password").fill("test1234");
    await page.locator("#login-submit").click();
  }

  const profileTrigger = page.getByTestId("desktop-profile-trigger");
  await expect(profileTrigger).toBeVisible({ timeout: 15_000 });
  const sidebarAvatar = page.getByTestId("desktop-profile-avatar");
  await expect(sidebarAvatar).toHaveText(INITIALS_PATTERN);
  await expect(sidebarAvatar).not.toHaveAttribute("src");
  await expect(page.getByTestId("desktop-organization-badge")).toBeVisible();
  await profileTrigger.click();

  await expect(page).toHaveURL(USER_SETTINGS_URL_PATTERN);
  await expect(
    page.getByRole("tab", { name: "User Settings" })
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("tab", { name: "Workspace Settings" })
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Organization Settings" })
  ).toBeVisible();
  await expect(page.getByTestId("identity-profile-avatar")).toHaveText(
    INITIALS_PATTERN
  );
  await expect(
    page.locator('input[type="file"][accept="image/*"]')
  ).toHaveCount(0);
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Identity", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Language & Region" })
  ).toBeVisible();
  const appearanceTab = page.getByRole("button", { name: "Appearance" });
  await expect(appearanceTab).toBeVisible();
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();

  await appearanceTab.click();
  const darkOption = page.getByRole("button", { name: "Dark", exact: true });
  const lightOption = page.getByRole("button", {
    name: "Light",
    exact: true,
  });
  const systemOption = page.getByRole("button", {
    name: SYSTEM_LABEL_PATTERN,
  });
  await darkOption.click();
  await expect(darkOption).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveClass(DARK_CLASS_PATTERN);
  await lightOption.click();
  await expect(lightOption).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).not.toHaveClass(DARK_CLASS_PATTERN);
  await systemOption.click();
  await expect(systemOption).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("tab", { name: "Workspace Settings" }).click();
  await expect(
    page.getByRole("button", { name: "Traceability & Identity" })
  ).toBeVisible();
  await page.getByRole("tab", { name: "Organization Settings" }).click();

  const auditLogTab = page.getByRole("button", { name: "Audit Log" });
  await expect(auditLogTab).toBeVisible();
  await auditLogTab.click();
  await expect(
    page.getByRole("heading", { name: "Recent Activity" })
  ).toBeVisible();
});
