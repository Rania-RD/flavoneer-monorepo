import { expect, type Page, test } from "@playwright/test";

async function openOrganizationSettings(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
  await page.goto("/organization");

  const emailInput = page.locator("#login-email");
  await emailInput
    .waitFor({ state: "visible", timeout: 10_000 })
    .catch(() => null);
  if (await emailInput.isVisible()) {
    await emailInput.fill("test@example.com");
    await page.locator("#login-password").fill("test1234");
    await page.locator("#login-submit").click();
  }

  const settingsTab = page.getByRole("button", { name: "Settings" });
  await expect(settingsTab).toBeVisible({ timeout: 20_000 });
  await settingsTab.click();
}

test("uploads and removes an organization icon", async ({ page }) => {
  await openOrganizationSettings(page);

  const icon = {
    name: "organization-icon.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64"
    ),
  };

  await page.getByTestId("organization-icon-input").setInputFiles(icon);
  await expect(page.getByTestId("organization-icon-preview")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove icon" })).toBeEnabled({
    timeout: 20_000,
  });

  await page.getByRole("button", { name: "Remove icon" }).click();
  await expect(page.getByTestId("organization-icon-placeholder")).toBeVisible({
    timeout: 20_000,
  });
});
