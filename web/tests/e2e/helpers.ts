import { expect, type Page } from '@playwright/test';

// End-to-end tests run against a real API with a dev database. Credentials come from the environment; there are no defaults.
export function creds(role: 'user' | 'admin') {
  const email = process.env[role === 'admin' ? 'E2E_ADMIN_EMAIL' : 'E2E_USER_EMAIL'];
  const password = process.env[role === 'admin' ? 'E2E_ADMIN_PASSWORD' : 'E2E_USER_PASSWORD'];
  if (!email || !password) throw new Error(`Set E2E_${role.toUpperCase()}_EMAIL and E2E_${role.toUpperCase()}_PASSWORD to run the end-to-end tests`);
  return { email, password };
}

export async function signIn(page: Page, role: 'user' | 'admin' = 'user') {
  const { email, password } = creds(role);
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/(home|onboarding)/);
}
