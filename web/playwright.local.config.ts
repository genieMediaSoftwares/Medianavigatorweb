import { defineConfig } from '@playwright/test';
import base from './playwright.config';

const origin = new URL(process.env.E2E_BASE_URL!);
if (origin.hostname !== '127.0.0.1' && origin.hostname !== 'localhost') throw new Error('Local acceptance requires a loopback website');
if (!process.env.E2E_CHROMIUM_PATH) throw new Error('E2E_CHROMIUM_PATH must identify the installed local test browser');

export default defineConfig({
  ...base,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 45_000 },
  use: { ...base.use, launchOptions: { executablePath: process.env.E2E_CHROMIUM_PATH } },
});
