import { expect, test } from "@playwright/test";

// Use a timestamp to ensure unique names for test entities
const timestamp = Date.now();
const INGREDIENT_NAME = `E2E Test Ingredient - ${timestamp}`;
const FORMULATION_NAME = `E2E Formulation - ${timestamp}`;
const INITIAL_STOCK = 100;
const REQUIRED_WEIGHT = 20;
const EXPECTED_FINAL_STOCK = INITIAL_STOCK - REQUIRED_WEIGHT;

test.describe("Core Manufacturing Flow (E2E)", () => {
  // Increase timeout for the entire suite to account for complex flows
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    // 1. Authentication
    // Navigate to local dev server
    await page.goto("/");

    // Explicitly wait for the app to load either the login form or the dashboard
    const emailInput = page.locator("#login-email");
    await emailInput
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(() => null);

    if (await emailInput.isVisible()) {
      await emailInput.fill("test@example.com");
      await page.locator("#login-password").fill("test1234");
      await page.locator("#login-submit").click();

      // If the database is empty locally, login will fail. Auto sign-up instead.
      const errorMsg = page.locator("text=Invalid email"); // Or similar text in error banner
      try {
        await expect(errorMsg).toBeVisible({ timeout: 3000 });
        // Account doesn't exist, sign up instead
        await page.locator("#goto-signup").click();

        await expect(page.locator("#signup-name")).toBeVisible({
          timeout: 5000,
        });
        await page.locator("#signup-name").fill("E2E Test User");
        await page.locator("#signup-email").fill("test@example.com");
        await page.locator("#signup-password").fill("test1234");
        await page.locator("#signup-confirm-password").fill("test1234");
        await page.locator("#signup-submit").click();
      } catch (e) {
        // No error message appeared, meaning login succeeded, or it's still loading. Proceed.
      }
    }

    // Wait for the navigation bar / sidebar to become visible
    try {
      await expect(page.locator("aside")).toBeVisible({ timeout: 20_000 });
    } catch (e) {
      await page.screenshot({ path: "debug-auth-fail.png" });
      throw e;
    }

    // Handle initial onboarding if it's a completely new account (Team creation)
    const createTeamInput = page.getByTestId("create-team-name-input");
    try {
      await createTeamInput.waitFor({ state: "visible", timeout: 5000 });
      await createTeamInput.fill("E2E Test Team");
      await page.getByTestId("create-team-submit-button").click();

      // Wait for the onboarding to finish and the normal dashboard to appear
      await expect(page.getByTestId("new-project-button").first()).toBeVisible({
        timeout: 15_000,
      });
    } catch (e) {
      // Proceed if not visible (already onboarded)
    }
  });

  test("should successfully execute full manufacturing flow and deduct inventory", async ({
    page,
  }) => {
    // ==========================================
    // Phase 1: Inventory Setup
    // ==========================================
    await test.step("Create new raw material with initial stock", async () => {
      // Navigate to Inventory page (now Materials) via sidebar
      await page.locator("nav a[href='/materials']").first().click();

      await page.getByTestId("add-material-button").click();

      // Wait for the modal to open
      await expect(page.getByTestId("add-material-modal")).toBeVisible();

      // Fill info tab
      await page.getByTestId("material-name-input").fill(INGREDIENT_NAME);

      // Click "Next Step" to go to stock & expiry tab
      await page.getByTestId("material-next-step-button").click();

      // Fill stock tab
      await page
        .getByTestId("material-quantity-input")
        .fill(INITIAL_STOCK.toString());

      // Set future expiry date (e.g. 2030-01-01)
      await page.getByTestId("material-expiry-date-input").fill("2030-01-01");

      // Save item (target the last button which is in the modal)
      await page.getByTestId("material-submit-button").click();

      // Wait for the modal to close and the new item to appear
      await expect(page.locator(`text=${INGREDIENT_NAME}`).first()).toBeVisible(
        { timeout: 10_000 }
      );
    });

    // ==========================================
    // Phase 2: Procedure Creation
    // ==========================================
    await test.step("Create formulation with weighing step and publish it", async () => {
      // Navigate Back to Dashboard for formulation creation
      await page.goto("/"); // The app creates formulations from the Dashboard via the 'New Project' button.

      // Click New Project (Wait for dashboard header to ensure load)
      await expect(page.getByTestId("new-project-button").first()).toBeVisible({
        timeout: 15_000,
      });
      await page.getByTestId("new-project-button").first().click();

      // Modal > General Info
      const titleInput = page.getByTestId("project-name-input");
      await expect(titleInput).toBeVisible();
      await titleInput.fill(FORMULATION_NAME);

      // Click "Next Step" x 2 to skip Technical and go to Compliance, then Create
      await page.getByTestId("project-next-step-button").click();
      await page.getByTestId("project-next-step-button").click();

      // Click Save/Create
      await page.getByTestId("project-submit-button").click();

      // Wait for redirect to Formulation page
      await expect(
        page.locator("h1", { hasText: FORMULATION_NAME })
      ).toBeVisible({ timeout: 15_000 });

      // The formulation comes with a default Phase A structurally.
      // Add a Weighing Step inside the default phase
      await page.getByTestId("add-content-button").first().click();
      await page.getByTestId("add-step-weighing-button").click();

      // Select the newly created ingredient from the dropdown list
      const ingredientSelect = page
        .getByTestId("step-ingredient-select")
        .first();
      // Find the option's exact value since the label contains dynamic stock text
      const optionLocator = ingredientSelect.locator("option", {
        hasText: INGREDIENT_NAME,
      });
      const optionValue = await optionLocator.getAttribute("value");
      if (optionValue) {
        await ingredientSelect.selectOption({ value: optionValue });
      }

      // Fill in required weight target
      const targetWeightInput = page
        .getByTestId("step-target-quantity-input")
        .first();
      await targetWeightInput.fill(REQUIRED_WEIGHT.toString());

      // Save the formulation BEFORE releasing to prevent stale React state overwriting the status
      const saveBtn = page.getByTestId("save-formulation-button");
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        // Wait for the toast to ensure it finished saving
        await expect(
          page.getByText("Formulation saved successfully")
        ).toBeVisible({ timeout: 5000 });
      }

      // Publish/Release the formulation (Native UI Select)
      const statusSelect = page.getByTestId("formulation-status-select");
      await statusSelect.selectOption("Released");

      // Wait a moment for the release to propagate before navigating away
      await page.waitForTimeout(1000);
    });

    // ==========================================
    // Phase 3: Run Execution
    // ==========================================
    await test.step("Execute Run and complete weighing", async () => {
      // Navigate to Runs page reliably
      await page.goto("/runs");
      await expect(page.getByTestId("run-selection-view")).toBeVisible({
        timeout: 15_000,
      });

      // Find the card for our E2E formulation
      const projectCard = page
        .getByTestId("run-project-card")
        .filter({ hasText: FORMULATION_NAME })
        .first();
      await expect(projectCard).toBeVisible();

      // Provide sign-off signature
      const signatureInput = projectCard.getByTestId("run-signature-input");
      if (await signatureInput.isVisible()) {
        await signatureInput.fill("E2E Auto Sign");
      }

      // Click Run Procedure
      await projectCard.getByTestId("run-procedure-button").click();

      // Wait for it to initialize and navigate to active run view
      await expect(
        page.locator(`h2:has-text("${FORMULATION_NAME}")`)
      ).toBeVisible({ timeout: 15_000 });

      // Fill in the actual weighed amount during the run execution
      await page
        .getByTestId("run-actual-weight-input")
        .first()
        .fill(REQUIRED_WEIGHT.toString());

      // Finish and Save Run (since it's a 1-step, this button appears after all steps or at the bottom)
      await page.getByTestId("finish-save-run-button").click();

      // Return to Dashboard implies completion
      // Let's just pause slightly to ensure DB updates
      await page.waitForTimeout(1000);
    });

    // ==========================================
    // Phase 4: Inventory Validation
    // ==========================================
    await test.step("Validate inventory deduction", async () => {
      // Navigate back to Inventory page (now Materials) via sidebar
      await page.locator("nav a[href='/materials']").first().click();
      await expect(page.getByTestId("materials-page-title")).toBeVisible({
        timeout: 10_000,
      });

      // Find the material card
      const ingredientCard = page
        .getByTestId("inventory-card")
        .filter({ hasText: INGREDIENT_NAME })
        .first();
      await expect(ingredientCard).toBeVisible();

      // Assert that the stock level text contains the expected final stock
      await expect(
        ingredientCard.locator(`text=${EXPECTED_FINAL_STOCK}`)
      ).toBeVisible();
    });
  });
});
