import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against an already running web app (`npm run build && npm run start`, or `npm run dev`).
 * Its address comes from E2E_BASE_URL; there is no default. API calls are mocked at the browser boundary in each test
 * (tests/e2e/fixtures.ts), so no API or database is needed.
 */
const baseURL = process.env.E2E_BASE_URL;
if (!baseURL) throw new Error('E2E_BASE_URL is required to run end-to-end tests (the address of the running web app).');

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL, trace: 'retain-on-failure', timezoneId: 'Europe/London', locale: 'en-GB' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
});
