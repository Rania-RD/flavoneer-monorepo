import { expect, type Page, test } from "@playwright/test";

const INVALID_LOGIN_PATTERN = /invalid email|failed to fetch/i;

async function signInOrCreateAccount(page: Page) {
  await page.goto("/");

  const emailInput = page.locator("#login-email");
  await emailInput
    .waitFor({ state: "visible", timeout: 10_000 })
    .catch(() => null);

  if (await emailInput.isVisible()) {
    await emailInput.fill("test@example.com");
    await page.locator("#login-password").fill("test1234");
    await page.locator("#login-submit").click();

    const invalidLogin = page.getByText(INVALID_LOGIN_PATTERN);
    if (await invalidLogin.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.locator("#goto-signup").click();
      await page.locator("#signup-name").fill("E2E Test User");
      await page.locator("#signup-email").fill("test@example.com");
      await page.locator("#signup-password").fill("test1234");
      await page.locator("#signup-confirm-password").fill("test1234");
      await page.locator("#signup-submit").click();
    }
  }

  await expect(page.locator("aside")).toBeVisible({ timeout: 20_000 });

  const createOrganizationInput = page.getByTestId("create-organization-name-input");
  if (await createOrganizationInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await createOrganizationInput.fill("E2E Settings Organization");
    await page.getByTestId("create-organization-submit-button").click();
  }
}

test("workspace settings does not expose personal appearance or measurement system switching", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
  await signInOrCreateAccount(page);
  await page.goto("/settings");

  await expect(
    page.getByRole("heading", { level: 1, name: "Settings" })
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByRole("tab", { name: "Workspace Settings" })
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("heading", { level: 4, name: "Dark Mode" })
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Appearance" })).toHaveCount(0);
  await expect(
    page.getByText("Measurement Units", { exact: true })
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Metric" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Imperial" })).toHaveCount(0);
});
