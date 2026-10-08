import { defineConfig } from '@playwright/test';

// The end-to-end run needs a reachable web app. BASE_URL is required; there is no default.
const baseURL = process.env.E2E_BASE_URL;
if (!baseURL) throw new Error('E2E_BASE_URL is required to run the end-to-end tests');

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL },
  reporter: 'list',
});
