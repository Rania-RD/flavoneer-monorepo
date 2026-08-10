import { expect, type Page, test } from "@playwright/test";
import { getOrganizationInitials } from "../lib/organization-icon";

test("uses the first two organization words for initials", () => {
  expect(getOrganizationInitials("E2E Test Team")).toBe("ET");
  expect(getOrganizationInitials("Flavoneer")).toBe("F");
  expect(getOrganizationInitials("  مختبر   الأغذية  ")).toBe("ما");
});

async function openOrganizations(page: Page) {
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

  await expect(
    page.getByRole("button", { name: "Create Organization", exact: true })
  ).toBeVisible({ timeout: 20_000 });
}

test("uploads and removes an organization icon", async ({ page }) => {
  await openOrganizations(page);

  const organizationName = `Icon Test ${Date.now()}`;
  let temporaryOrganizationCreated = false;

  await page
    .getByRole("button", { name: "Create Organization", exact: true })
    .click();
  await page.getByPlaceholder("Ex: R&D Alpha").fill(organizationName);
  await page
    .getByRole("button", { name: "Create Organization", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/\/$/u, { timeout: 20_000 });
  await page.goto("/organization");
  await expect(
    page.getByRole("heading", { name: organizationName, exact: true })
  ).toBeVisible({ timeout: 20_000 });
  temporaryOrganizationCreated = true;

  const icon = {
    name: "organization-icon.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64"
    ),
  };

  try {
    await page.getByRole("button", { name: "Settings" }).click();
    const iconInput = page.getByTestId("organization-icon-input");
    const iconPreview = page.getByTestId("organization-icon-preview");
    const removeIconButton = page.getByRole("button", {
      name: "Remove icon",
    });

    await iconInput.setInputFiles(icon);
    await expect(iconPreview).toBeVisible();
    await expect(removeIconButton).toBeEnabled({ timeout: 20_000 });

    await removeIconButton.click();
    const organizationPlaceholder = page.getByTestId(
      "organization-icon-placeholder"
    );
    await expect(organizationPlaceholder).toBeVisible({ timeout: 20_000 });
    await expect(organizationPlaceholder).toHaveCSS(
      "background-color",
      "rgb(245, 166, 35)"
    );
    await expect(organizationPlaceholder).toHaveCSS(
      "color",
      "rgb(23, 62, 51)"
    );
    const organizationInitials = await organizationPlaceholder.textContent();

    await page.goto("/");
    const taskbarBadge = page.getByTestId("desktop-organization-badge");
    await expect(taskbarBadge).toBeVisible({ timeout: 20_000 });
    await expect(taskbarBadge.locator("img")).toHaveCount(0);
    await expect(taskbarBadge).toHaveText(organizationInitials ?? "");

    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await expect(taskbarBadge).toHaveCSS("background-color", "rgb(245, 166, 35)");
    await expect(taskbarBadge).toHaveCSS("color", "rgb(23, 62, 51)");
  } finally {
    if (temporaryOrganizationCreated) {
      await page.goto("/organization");
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      await page
        .getByRole("button", { name: "Delete Organization", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Yes, Delete Organization", exact: true })
        .click();
      await expect(
        page.getByText(organizationName, { exact: true })
      ).toHaveCount(0, { timeout: 20_000 });
    }
  }
});
