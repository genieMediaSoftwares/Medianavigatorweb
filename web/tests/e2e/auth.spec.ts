import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('private pages send signed-out visitors to sign in, then back', async ({ page }) => {
  await page.goto('/posts');
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fposts/);
  await signIn(page);
  await page.goto('/posts');
  await expect(page.getByRole('heading', { name: 'Posts', level: 1 })).toBeVisible();
});

test('a wrong password gets a kind message that does not reveal whether the email exists', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill('nobody@example.com');
  await page.getByLabel('Password').fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText(/email and password don.t match/i)).toBeVisible();
});

test('signing out ends the session', async ({ page }) => {
  await signIn(page);
  await page.getByRole('button', { name: 'Account menu' }).first().click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/sign-in/);
  await page.goto('/home');
  await expect(page).toHaveURL(/\/sign-in/);
});

test('sign-up validates as you type and creates an account that starts onboarding', async ({ page }) => {
  const stamp = Date.now();
  await page.goto('/sign-up');
  await page.getByLabel('Your name').fill('E2E Tester');
  await page.getByLabel('Email').fill('not-an-email');
  await page.getByLabel('Password').fill('short');
  await page.getByLabel('Your name').click();
  await expect(page.getByText(/Add an @/)).toBeVisible();
  await page.getByLabel('Email').fill(`e2e+${stamp}@example.com`);
  await page.getByLabel('Password').fill(`Passw0rd-${stamp}`);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByText('Step 1 of 2')).toBeVisible();
});
