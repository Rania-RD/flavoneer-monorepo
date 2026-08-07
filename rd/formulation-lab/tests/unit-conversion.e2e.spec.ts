import { expect, type Page, test } from "@playwright/test";

function makeFixture(label: string) {
  const suffix = `${Date.now()}-${label}`;
  return {
    formulationName: `E2E Unit Formula ${suffix}`,
    ingredientCode: `E2E-UNIT-${suffix}`,
    ingredientName: `E2E Unit Milk ${suffix}`,
  };
}

async function signInOrCreateAccount(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("i18nextLng", "en");
  });
  await page.goto("/");

  const emailInput = page.locator("#login-email");
  await emailInput.waitFor({ state: "visible", timeout: 10_000 }).catch(() => null);

  if (await emailInput.isVisible()) {
    await emailInput.fill("test@example.com");
    await page.locator("#login-password").fill("test1234");
    await page.locator("#login-submit").click();

    const invalidLogin = page.getByText(/invalid email|failed to fetch/i);
    if (await invalidLogin.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.locator("#goto-signup").click();
      await page.locator("#signup-name").fill("E2E Test User");
      await page.locator("#signup-email").fill("test@example.com");
      await page.locator("#signup-password").fill("test1234");
      await page.locator("#signup-confirm-password").fill("test1234");
      await page.locator("#signup-submit").click();
    }
  }

  const createOrganizationInput = page.getByTestId("create-organization-name-input");
  if (await createOrganizationInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await createOrganizationInput.fill("E2E Unit Conversion Organization");
    await page.getByTestId("create-organization-submit-button").click();
  }

  await expect(page.locator("aside")).toBeVisible({ timeout: 20_000 });
}

async function waitForAutosave(page: Page) {
  await expect(page.getByTestId("autosave-status")).toContainText(/saved/i, {
    timeout: 20_000,
  });
}

async function expectMetric(page: Page, testId: string, value: RegExp | string) {
  await expect(page.getByTestId(testId)).toContainText(value, {
    timeout: 15_000,
  });
}

async function selectServingSizeUnit(page: Page, unit: string) {
  const testIdSelect = page.getByTestId("serving-size-unit-select");
  if (await testIdSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
    await testIdSelect.selectOption(unit);
    return;
  }

  await page.locator(`select:has(option[value="${unit}"])`).first().selectOption(unit);
}

async function addNutrient(
  page: Page,
  index: number,
  nutrientId: string,
  value: string,
  unit: string
) {
  const addButton = page.getByTestId("add-nutrient-button");
  if (await addButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await addButton.click();
  } else {
    await page.getByRole("button", { name: /add nutrient/i }).click();
  }

  const nutrientSelects = page.getByTestId("nutrient-select");
  const nutrientSelect =
    (await nutrientSelects.count()) > index
      ? nutrientSelects.nth(index)
      : page.locator('#add-ingredient-form select').nth(index + 1);
  await nutrientSelect.selectOption(nutrientId);

  const nutrientValues = page.getByTestId("nutrient-value-input");
  const nutrientValue =
    (await nutrientValues.count()) > index
      ? nutrientValues.nth(index)
      : page.locator('#add-ingredient-form input[type="number"]').nth(index);
  await nutrientValue.fill(value);

  const nutrientUnits = page.getByTestId("nutrient-unit-input");
  const nutrientUnit =
    (await nutrientUnits.count()) > index
      ? nutrientUnits.nth(index)
      : page
          .locator(
            '#add-ingredient-form input:not([type="checkbox"]):not([type="number"])'
          )
          .nth(index);
  await nutrientUnit.fill(unit);
}

async function createIngredientWithCostAndNutrition(
  page: Page,
  ingredientName: string,
  ingredientCode: string
) {
  await page.goto("/materials");
  await page.getByTestId("materials-tab-library").click();
  await page.getByTestId("add-ingredient-library-button").first().click();

  await page.getByTestId("ingredient-name-en-input").fill(ingredientName);
  await page.getByTestId("ingredient-name-ar-input").fill(`${ingredientName} AR`);
  await page.getByTestId("ingredient-code-input").fill(ingredientCode);
  await page.getByTestId("ingredient-cost-per-kg-input").fill("4.5");
  await page.getByTestId("add-ingredient-next-button").click();

  await addNutrient(page, 0, "calories", "50", "kcal");
  await addNutrient(page, 1, "protein", "2", "g");
  await addNutrient(page, 2, "carbohydrates", "8", "g");
  await addNutrient(page, 3, "total_fat", "1", "g");

  await page.getByRole("button", { name: /verify allergens/i }).click();
  await page.getByTestId("add-ingredient-save-button").click();
  await expect(page.getByText(ingredientName).first()).toBeVisible({
    timeout: 15_000,
  });
}

async function createFormulationWithIngredient(
  page: Page,
  formulationName: string,
  ingredientName: string
) {
  await page.goto("/");
  await expect(page.getByTestId("new-project-button").first()).toBeVisible({
    timeout: 15_000,
  });
  await page.getByTestId("new-project-button").first().click();

  await page.getByTestId("project-name-input").fill(formulationName);
  await page.locator('input[name="nameAr"]').fill(`${formulationName} AR`);
  await page.getByTestId("project-next-step-button").click();
  await page.getByTestId("project-next-step-button").click();
  await page.getByTestId("project-submit-button").click();

  await expect(page).toHaveURL(/\/project\//, { timeout: 20_000 });
  await expect(page.locator("h1", { hasText: formulationName })).toBeVisible({
    timeout: 20_000,
  });

  await page.getByTestId("add-content-button").first().click();
  await page.getByTestId("add-step-weighing-button").click();

  const ingredientSelect = page.getByTestId("step-ingredient-select").first();
  const ingredientOption = ingredientSelect.locator("option", {
    hasText: ingredientName,
  });
  await expect(ingredientOption).toHaveCount(1, { timeout: 15_000 });
  const ingredientId = await ingredientOption.first().getAttribute("value");
  expect(ingredientId).toBeTruthy();
  await ingredientSelect.selectOption(ingredientId ?? "");

  await page.getByTestId("step-target-quantity-input").first().fill("1000");
  await page.getByTestId("step-unit-select").first().selectOption("g");
  await waitForAutosave(page);
}

test.describe("unit conversion across formulation workflows", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    await signInOrCreateAccount(page);
  });

  test("converts editor rows, persists autosaved units, and keeps costs/nutrition correct", async ({
    page,
  }) => {
    const fixture = makeFixture("rows");
    await createIngredientWithCostAndNutrition(
      page,
      fixture.ingredientName,
      fixture.ingredientCode
    );
    await createFormulationWithIngredient(
      page,
      fixture.formulationName,
      fixture.ingredientName
    );

    const targetQuantity = page.getByTestId("step-target-quantity-input").first();
    const targetUnit = page.getByTestId("step-unit-select").first();

    await expect(targetQuantity).toHaveValue("1000");
    await expect(targetUnit).toHaveValue("g");
    await expectMetric(page, "batch-weight-display", /^1000$/);

    await page.getByTestId("serving-size-mode-recipeMakes-button").click();
    await page.getByTestId("serving-size-amount-input").fill("10");
    await waitForAutosave(page);

    await expectMetric(page, "serving-size-weight-display", /^100 g$/);
    await expectMetric(page, "batch-cost-display", /\$4\.50/);
    await expectMetric(page, "cost-per-serving-display", /\$0\.45/);
    await expectMetric(page, "nutrition-calories", /^50$/);
    await expectMetric(page, "nutrition-protein", "2g");
    await expectMetric(page, "nutrition-fat", "1g");
    await expectMetric(page, "nutrition-carbohydrates", "8g");

    await targetUnit.selectOption("kg");
    await expect(targetQuantity).toHaveValue("1");
    await waitForAutosave(page);
    await page.reload();
    await expect(page.getByTestId("step-target-quantity-input").first()).toHaveValue(
      "1",
      { timeout: 15_000 }
    );
    await expect(page.getByTestId("step-unit-select").first()).toHaveValue("kg");
    await expectMetric(page, "batch-weight-display", /^1000$/);
    await expectMetric(page, "batch-cost-display", /\$4\.50/);
    await expectMetric(page, "nutrition-calories", /^50$/);

    await page.getByTestId("step-unit-select").first().selectOption("mg");
    await expect(page.getByTestId("step-target-quantity-input").first()).toHaveValue(
      "1000000"
    );
    await waitForAutosave(page);
    await page.reload();
    await expect(page.getByTestId("step-target-quantity-input").first()).toHaveValue(
      "1000000",
      { timeout: 15_000 }
    );
    await expect(page.getByTestId("step-unit-select").first()).toHaveValue("mg");
    await expectMetric(page, "batch-weight-display", /^1000$/);
    await expectMetric(page, "cost-per-serving-display", /\$0\.45/);
    await expectMetric(page, "nutrition-calories", /^50$/);

    await page.getByTestId("step-unit-select").first().selectOption("g");
    await expect(page.getByTestId("step-target-quantity-input").first()).toHaveValue(
      "1000"
    );
  });

  test("normalizes serving-size units before downstream serving calculations", async ({
    page,
  }) => {
    const fixture = makeFixture("serving");
    await createIngredientWithCostAndNutrition(
      page,
      fixture.ingredientName,
      fixture.ingredientCode
    );
    await createFormulationWithIngredient(
      page,
      fixture.formulationName,
      fixture.ingredientName
    );

    await page.getByTestId("serving-size-mode-servingIs-button").click();

    for (const [amount, unit] of [
      ["100", "g"],
      ["0.1", "kg"],
      ["100000", "mg"],
      ["100", "ml"],
    ] as const) {
      await page.getByTestId("serving-size-amount-input").fill(amount);
      await selectServingSizeUnit(page, unit);
      await waitForAutosave(page);

      await expectMetric(page, "serving-size-weight-display", /^100 g$/);
      await expectMetric(page, "batch-yield-display", /^1000$/);
      await expectMetric(page, "cost-per-serving-display", /\$0\.45/);
      await expectMetric(page, "nutrition-calories", /^50$/);
      await expectMetric(page, "nutrition-protein", "2g");
      await expectMetric(page, "nutrition-fat", "1g");
      await expectMetric(page, "nutrition-carbohydrates", "8g");
    }
  });
});
