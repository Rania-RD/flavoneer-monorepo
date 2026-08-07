import { expect, test } from "@playwright/test";

const INITIALS_PATTERN = /^(?:\p{L}{1,2}|\?)$/u;
const DARK_CLASS_PATTERN = /dark/;
const SYSTEM_LABEL_PATTERN = /System/;

test("personal activity is available from the audit log, not profile settings", async ({
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
  await expect(profileTrigger.locator("img")).toHaveCount(0);
  await profileTrigger.click();

  const dialog = page.getByRole("dialog", { name: "Profile & Identity" });
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId("identity-profile-avatar")).toHaveText(
    INITIALS_PATTERN
  );
  await expect(
    dialog.locator('input[type="file"][accept="image/*"]')
  ).toHaveCount(0);
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(dialog.getByRole("tab", { name: "Identity" })).toBeVisible();
  await expect(
    dialog.getByRole("tab", { name: "Digital Signature" })
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("tab", { name: "Language & Region" })
  ).toBeVisible();
  const appearanceTab = dialog.getByRole("tab", { name: "Appearance" });
  await expect(appearanceTab).toBeVisible();
  await expect(dialog.getByRole("tab", { name: "Activity" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Logout" })).toBeVisible();

  await appearanceTab.click();
  const darkOption = dialog.getByRole("button", { name: "Dark", exact: true });
  const lightOption = dialog.getByRole("button", {
    name: "Light",
    exact: true,
  });
  const systemOption = dialog.getByRole("button", {
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

  await dialog.getByRole("button", { name: "Close" }).click();
  await page.goto("/settings");
  await expect(page.getByRole("button", { name: "Appearance" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Traceability & Identity" })
  ).toBeVisible();
  await page.goto("/organization");

  const auditLogTab = page.getByRole("button", { name: "Audit Log" });
  await expect(auditLogTab).toBeVisible();
  await auditLogTab.click();
  await expect(
    page.getByRole("heading", { name: "Recent Activity" })
  ).toBeVisible();
});
