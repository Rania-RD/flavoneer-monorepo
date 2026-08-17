import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";

const ORGANIZATION_NAME = "E2E QC Reporting Demo";
const BACKEND_DIRECTORY = fileURLToPath(
  new URL("../../../packages/backend/", import.meta.url)
);
const ROOT_URL_PATTERN = /\/$/u;
const QC_REPORT_FILENAME_PATTERN =
  /^qc-management-report-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.pdf$/u;
const ARABIC_QC_REPORT_FILENAME_PATTERN =
  /^تقرير-إدارة-الجودة-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.pdf$/u;
const ACTION_QUEUE_FIRST_PAGE_PATTERN = /^Page 1 of \d+$/u;
const ACTION_QUEUE_SECOND_PAGE_PATTERN = /^Page 2 of \d+$/u;
const REMOVED_REPORT_COPY = [
  "Production exceptions, process trends, review flow, audit evidence, and batch-linked laboratory outcomes.",
  "Current volume, exceptions, conformance, evidence, review flow, and laboratory coverage for the selected cohort.",
  "Find pending reviews, returned work, and measurement exceptions that need action.",
  "Operating requirement: complete one QC inspection every hour for each active production line.",
  "Compare actual readings with the limits stored on each inspection and isolate process drift.",
  "Find draft and returned records that are waiting for evidence or required confirmations.",
  "Compare recurring measurement and review outcomes while keeping sample size visible.",
  "Separate inspection preparation, review delays, repeat returns, and assignment volume.",
  "Workload and sample size are shown beside outcomes. These rows are not employee rankings.",
];

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
    lineHours: number;
    offlineLineHours: number;
    productionLines: number;
    samples: number;
  };
}

test("seeds and displays representative hourly QC manager reports", async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  await signIn(page);
  await selectOrCreateDemoOrganization(page);
  await ensureEnglishInterface(page);

  const seeded = seedDemoData();
  expect(seeded).toMatchObject({
    inspections: 479,
    inspectors: 3,
    labReports: 6,
    lineHours: 504,
    offlineLineHours: 25,
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
    page.getByRole("heading", { name: "QC management summary", level: 2 })
  ).toBeVisible();
  const exportButton = page.getByRole("button", { name: "Export PDF" });
  const printButton = page.getByRole("button", { name: "Print report" });
  await expect(exportButton).toBeEnabled({ timeout: 30_000 });
  await expect(printButton).toBeEnabled();
  const downloadPromise = page.waitForEvent("download");
  await exportButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(QC_REPORT_FILENAME_PATTERN);
  const pdfPath = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(pdfPath);
  await testInfo.attach("QC management report PDF", {
    contentType: "application/pdf",
    path: pdfPath,
  });
  for (const removedCopy of REMOVED_REPORT_COPY) {
    await expect(page.getByText(removedCopy, { exact: true })).toHaveCount(0);
  }
  await expect(page.getByText("Evidence completeness")).toBeVisible();
  const expectedActionQueueRows = [
    ["Twin", "BTC1"],
    ["Icy Lemon", "Rollo A"],
    ["Daymeh", "BTC2"],
    ["Rocky", "BTC2"],
  ] as const;
  const operationsSection = page.locator("#operations");
  const actionQueueGrid = operationsSection.getByRole("grid");
  const actionQueuePagination = operationsSection.getByRole("navigation", {
    name: "Action queue pages",
  });
  const previousPageButton = actionQueuePagination.getByRole("button", {
    name: "Previous page",
  });
  const nextPageButton = actionQueuePagination.getByRole("button", {
    name: "Next page",
  });
  const foundActionQueueRows = new Set<string>();
  await expect(
    actionQueuePagination.getByText(ACTION_QUEUE_FIRST_PAGE_PATTERN)
  ).toBeVisible();
  let pageNumber = 1;
  while (true) {
    const rowTexts = await actionQueueGrid.getByRole("row").allTextContents();
    for (const [productName, productionLine] of expectedActionQueueRows) {
      if (
        rowTexts.some(
          (rowText) =>
            rowText.includes(productName) && rowText.includes(productionLine)
        )
      ) {
        foundActionQueueRows.add(`${productName}:${productionLine}`);
      }
    }
    if (await nextPageButton.isDisabled()) {
      break;
    }
    await nextPageButton.click();
    pageNumber += 1;
    if (pageNumber === 2) {
      await expect(
        actionQueuePagination.getByText(ACTION_QUEUE_SECOND_PAGE_PATTERN)
      ).toBeVisible();
    }
  }
  expect(foundActionQueueRows).toEqual(
    new Set(
      expectedActionQueueRows.map(
        ([productName, productionLine]) => `${productName}:${productionLine}`
      )
    )
  );
  while (!(await previousPageButton.isDisabled())) {
    await previousPageButton.click();
  }
  await expect(
    actionQueuePagination.getByText(ACTION_QUEUE_FIRST_PAGE_PATTERN)
  ).toBeVisible();

  await page
    .getByRole("link", { name: "Process quality", exact: true })
    .click();
  const qualitySection = page.locator("#quality");
  const productSelect = qualitySection.getByLabel("Product");
  const parameterSelect = qualitySection.getByLabel("Parameter");
  await expect(productSelect.locator("option:checked")).toHaveText("Daymeh");
  await expect(productSelect.locator('option[value=""]')).toHaveCount(0);
  await expect(parameterSelect).toHaveValue("pour_weight");
  await expect(parameterSelect.locator('option[value=""]')).toHaveCount(0);
  await expect(
    qualitySection.getByRole("figure", { name: "chart, 1 series" })
  ).toBeVisible();
  await expect(
    qualitySection.getByRole("grid").getByText("103.8 g").first()
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

  await page.goto("/settings?scope=user&tab=localization");
  const languageSelect = page.locator(
    'select:has(option[value="en"]):has(option[value="ar"])'
  );
  await languageSelect.selectOption("ar");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await page.waitForTimeout(1000);
  await page.goto("/quality/reports");
  await expect(
    page.getByRole("heading", { name: "تقارير ضبط الجودة", level: 1 })
  ).toBeVisible({ timeout: 30_000 });
  const arabicExportButton = page.getByRole("button", {
    name: "تصدير PDF",
  });
  await expect(arabicExportButton).toBeEnabled({ timeout: 30_000 });
  const arabicDownloadPromise = page.waitForEvent("download");
  await arabicExportButton.click();
  const arabicDownload = await arabicDownloadPromise;
  expect(arabicDownload.suggestedFilename()).toMatch(
    ARABIC_QC_REPORT_FILENAME_PATTERN
  );
  const arabicPdfPath = testInfo.outputPath(
    `arabic-${arabicDownload.suggestedFilename()}`
  );
  await arabicDownload.saveAs(arabicPdfPath);
  await testInfo.attach("Arabic QC management report PDF", {
    contentType: "application/pdf",
    path: arabicPdfPath,
  });
  const arabicPrintButton = page.getByRole("button", {
    name: "طباعة التقرير",
  });
  await arabicPrintButton.click();
  await expect(arabicPrintButton).toBeDisabled();
  await expect(arabicPrintButton).toBeEnabled({ timeout: 30_000 });
});
