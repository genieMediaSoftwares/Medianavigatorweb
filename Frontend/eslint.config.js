// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      "dist/*",
      // Unused modules written for an older API; nothing imports them. Safe to delete.
      "src/features/home/**",
      "src/features/platforms/**",
      "src/features/accounts/**",
    ],
  }
]);
