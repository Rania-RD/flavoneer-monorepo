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
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.getByTestId("new-project-button").first().click();
}

test("uses dark surfaces and readable form controls in dark mode", async ({
  page,
}) => {
  await openNewProjectModal(page);

  await expect(page.getByTestId("new-project-modal")).toHaveCSS(
    "background-color",
    "rgb(20, 61, 50)"
  );
  await expect(page.getByTestId("new-project-modal-body")).toHaveCSS(
    "background-color",
    "rgb(20, 61, 50)"
  );
  await expect(page.getByTestId("project-name-input")).toHaveCSS(
    "background-color",
    "rgb(23, 62, 51)"
  );
  await expect(page.getByTestId("project-name-input")).toHaveCSS(
    "color",
    "rgb(247, 244, 223)"
  );
  await expect(page.getByTestId("project-next-step-button")).toHaveCSS(
    "background-color",
    "rgb(245, 166, 35)"
  );

  await page.getByTestId("project-next-step-button").click();
  await expect(page.getByTestId("batch-code-preview")).toHaveCSS(
    "background-color",
    "rgb(16, 47, 39)"
  );

  await page.getByTestId("project-next-step-button").click();
  await expect(
    page.getByTestId("testing-requirement-option").first()
  ).toHaveCSS("background-color", /0\.55\)$/);
  await expect(page.getByTestId("project-submit-button")).toHaveCSS(
    "background-color",
    "rgb(245, 166, 35)"
  );
});
