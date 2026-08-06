import { expect, test } from "@playwright/test";

const INITIALS_PATTERN = /^(?:\p{L}{1,2}|\?)$/u;

test("sidebar avatar opens the personal profile modal directly", async ({
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
  ).toBeVisible();
  await expect(
    dialog.getByRole("tab", { name: "Language & Region" })
  ).toBeVisible();
  await expect(dialog.getByRole("tab", { name: "Activity" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Logout" })).toBeVisible();
});
