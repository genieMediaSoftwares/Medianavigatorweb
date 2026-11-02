import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Unit tests for the app's pure logic (no React Native runtime). Screens are verified in the running app.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['tests/**/*.test.{ts,mjs}'], environment: 'node' },
});
