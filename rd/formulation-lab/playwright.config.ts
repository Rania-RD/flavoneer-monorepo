import { createPlaywrightEnv } from "@flavoneer/config/env/server";
import { defineConfig, devices } from "@playwright/test";

const env = createPlaywrightEnv({
  CI: process.env.CI,
  PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL,
  PLAYWRIGHT_SKIP_WEB_SERVER: process.env.PLAYWRIGHT_SKIP_WEB_SERVER,
});

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: env.ci,
  /* Retry on CI only */
  retries: env.ci ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: env.ci ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: env.baseUrl,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: env.skipWebServer
    ? undefined
    : {
        command: "pnpm run dev",
        url: env.baseUrl,
        reuseExistingServer: !env.ci,
      },
});
