import { expect, test } from "@playwright/test";

test("flask selector switches the workspace navigation to quality control", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
    if (!window.sessionStorage.getItem("workspace-section-test-seeded")) {
      window.localStorage.removeItem("flavoneer.workspace-section");
      window.sessionStorage.setItem("workspace-section-test-seeded", "true");
    }
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

  const selector = page.getByTestId("rail-section-selector");
  await expect(selector).toBeVisible({ timeout: 15_000 });
  await selector.click();
  await page.getByRole("menuitemradio", { name: /Quality Control/ }).click();

  await expect(page).toHaveURL(/\/reports$/);
  await expect(
    page.getByRole("heading", { name: "Lab Reports", level: 1 })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Production Monitoring" })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Lab Reports" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Run review" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Organization" })).toHaveCount(0);
  await expect(selector.locator('[data-mode-icon="quality"]')).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("rail-section-selector")).toBeVisible();
  await expect(
    page.getByTestId("desktop-workspace-navigation").getByRole("link")
  ).toHaveCount(4);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.localStorage.getItem("flavoneer.workspace-section")
      )
    )
    .toBe("quality");
});
