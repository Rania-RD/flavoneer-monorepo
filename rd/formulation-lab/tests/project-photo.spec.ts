import { expect, type Page, test } from "@playwright/test";

async function openNewProjectModal(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
  await page.goto("/");

  const emailInput = page.locator("#login-email");
  await emailInput
    .waitFor({ state: "visible", timeout: 10_000 })
    .catch(() => null);
  if (await emailInput.isVisible()) {
    await emailInput.fill("test@example.com");
    await page.locator("#login-password").fill("test1234");
    await page.locator("#login-submit").click();
  }

  await expect(page.getByTestId("new-project-button").first()).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId("new-project-button").first().click();
}

test("previews, removes, and persists an optional project photo", async ({
  page,
}) => {
  await openNewProjectModal(page);

  const photo = {
    name: "project-photo.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64"
    ),
  };
  const photoInput = page.getByTestId("project-photo-input");
  await photoInput.setInputFiles(photo);

  await expect(page.getByTestId("project-photo-preview")).toBeVisible();
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByTestId("project-photo-preview")).toHaveCount(0);

  const projectName = `Photo project ${Date.now()}`;
  await photoInput.setInputFiles(photo);
  await page.getByTestId("project-name-input").fill(projectName);
  await page.getByTestId("project-next-step-button").click();
  await page.getByTestId("project-next-step-button").click();
  await page.getByTestId("project-submit-button").click();

  await expect(page).toHaveURL(/\/project\//, { timeout: 20_000 });
  await page.goto("/");
  await expect(
    page.getByRole("img", { name: `Photo for ${projectName}` })
  ).toBeVisible({ timeout: 20_000 });
});
