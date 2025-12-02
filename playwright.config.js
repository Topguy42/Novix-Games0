// Playwright config for the project. It will start the server automatically using `pnpm start`.
import { defineConfig } from '@playwright/test';

/** @type {import('@playwright/test').PlaywrightTestConfig} */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'pnpm start',
    reuseExistingServer: true,
    timeout: 20000,
    url: 'http://localhost:3000'
  }
});
