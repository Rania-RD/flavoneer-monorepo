import { expect, test } from "@playwright/test";

test("redirects to login if not authenticated", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#login-submit")).toBeVisible();
});
