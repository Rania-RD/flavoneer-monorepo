import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";

const ORGANIZATION_NAME = "E2E QC Reporting Demo";
const BACKEND_DIRECTORY = fileURLToPath(
  new URL("../../../packages/backend/", import.meta.url)
);
const ROOT_URL_PATTERN = /\/$/u;

async function signIn(page: Page) {
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
  await expect(page.getByTestId("desktop-organization-badge")).toBeVisible({
    timeout: 20_000,
  });
}

async function selectOrCreateDemoOrganization(page: Page) {
  await page.getByTestId("desktop-organization-badge").click();
  const switchButton = page.getByRole("menuitemradio", {
    name: new RegExp(ORGANIZATION_NAME, "u"),
  });
  if (await switchButton.isVisible().catch(() => false)) {
    await switchButton.click();
    return;
  }

  await page.keyboard.press("Escape");
  await page.goto("/organization");
  await page
    .getByRole("button", { name: "Create Organization", exact: true })
    .click();
  await page.getByPlaceholder("Ex: R&D Alpha").fill(ORGANIZATION_NAME);
  await page
    .getByRole("button", { name: "Create Organization", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(ROOT_URL_PATTERN, { timeout: 20_000 });
}

async function ensureEnglishInterface(page: Page) {
  await page.goto("/settings?scope=user&tab=localization");
  const languageSelect = page.locator(
    'select:has(option[value="en"]):has(option[value="ar"])'
  );
  await expect(languageSelect).toBeVisible({ timeout: 20_000 });
  await languageSelect.selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
}

function seedDemoData() {
  const output = execFileSync(
    "pnpm",
    [
      "exec",
      "convex",
      "run",
      "e2eQualityReportSeedAction:seedQualityReports",
      JSON.stringify({
        organizationName: ORGANIZATION_NAME,
        confirmation: "seed-e2e-qc-reporting-demo",
      }),
    ],
    {
      cwd: BACKEND_DIRECTORY,
      encoding: "utf8",
      timeout: 120_000,
    }
  );
  return JSON.parse(output) as {
    inspections: number;
    inspectors: number;
    labReports: number;
    productionLines: number;
    samples: number;
  };
}

test("seeds and displays representative hourly QC manager reports", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  await selectOrCreateDemoOrganization(page);
  await ensureEnglishInterface(page);

  const seeded = seedDemoData();
  expect(seeded).toMatchObject({
    inspections: 36,
    inspectors: 3,
    labReports: 6,
    productionLines: 3,
    samples: 8,
  });

  await page.goto("/quality/reports");
  await expect(
    page.getByRole("heading", { name: "QC Reports", level: 1 })
  ).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByText(
      "Operating requirement: complete one QC inspection every hour for each active production line."
    )
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "QC management summary", level: 2 })
  ).toBeVisible();
  await expect(page.getByText("Evidence completeness")).toBeVisible();
  for (const productName of ["Twin", "Rocky", "Daymeh", "Icy Lemon"]) {
    await expect(
      page
        .getByRole("grid")
        .first()
        .getByText(productName, { exact: true })
        .first()
    ).toBeVisible();
  }
  for (const [productName, productionLine] of [
    ["Twin", "BTC1"],
    ["Icy Lemon", "Rollo A"],
    ["Daymeh", "BTC2"],
    ["Rocky", "BTC2"],
  ]) {
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: productName })
        .filter({ hasText: productionLine })
        .first()
    ).toBeVisible({ timeout: 15_000 });
  }

  await page
    .getByRole("link", { name: "Process quality", exact: true })
    .click();
  const parameterSelect = page.getByLabel("Parameter");
  await expect(parameterSelect).toHaveValue("pour_weight");
  await expect(parameterSelect.locator('option[value=""]')).toHaveCount(0);
  const qualitySection = page.locator("#quality");
  await expect(
    qualitySection.getByRole("figure", { name: "chart, 1 series" })
  ).toBeVisible();
  await expect(
    qualitySection.getByRole("grid").getByText("103.6 g").first()
  ).toBeVisible();
  await expect(page.getByText("103.600000", { exact: false })).toHaveCount(0);

  await page.getByRole("link", { name: "Workflow", exact: true }).click();
  for (const inspectorName of ["Ameer", "Qusai", "Shaima"]) {
    await expect(
      page
        .locator("#workflow")
        .getByRole("grid")
        .first()
        .getByText(inspectorName, { exact: true })
        .first()
    ).toBeVisible();
  }

  await page.getByRole("link", { name: "Laboratory", exact: true }).click();
  const laboratorySection = page.locator("#laboratory");
  await expect(
    laboratorySection.getByText("Recent batch-linked lab reports")
  ).toBeVisible();
  await expect(
    laboratorySection.getByText("QC-DEMO-001", { exact: true })
  ).toBeVisible();
  await expect(
    laboratorySection.getByText("QC-DEMO-006", { exact: true })
  ).toBeVisible();

  await page.getByRole("button", { name: "Open audit register" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Batch traceability and audit register",
      level: 2,
    })
  ).toBeVisible();

  await page.getByRole("button", { name: "Management report" }).click();
  await page.setViewportSize({ height: 844, width: 390 });
  await expect(
    page.getByRole("heading", { name: "QC management summary", level: 2 })
  ).toBeVisible();
  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
});
