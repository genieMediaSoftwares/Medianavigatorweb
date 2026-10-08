import { expect, test } from '@playwright/test';
import { connections, me, mockApi, profile, reply, signIn, shell } from './fixtures';

test('create an account, then finish the two-step setup', async ({ page, context, baseURL }) => {
  let current = profile({ onboardingCompleted: false, timezone: null });
  const patches: unknown[] = [];

  await mockApi(page, {
    ...shell(),
    'POST /auth/register': async (body) => {
      expect(body).toMatchObject({ email: 'sam@example.test', fullName: 'Sam Rivera' });
      expect(JSON.stringify(body)).not.toContain('consent');
      await signIn(context, baseURL!);
      return reply.created({ user: me().user, profile: current });
    },
    'GET /auth/me': () => reply.ok({ ...me(), profile: current }),
    'PATCH /profiles/me': (body) => {
      patches.push(body);
      current = { ...current, ...(body as object) };
      return reply.ok({ profile: current });
    },
    'GET /connections': () => reply.ok(connections()),
  });

  await page.goto('/create-account');
  await page.getByLabel('Your name').fill('Sam Rivera');
  await page.getByLabel('Email').fill('sam.example.test');
  await expect(page.getByText('Add an @ to your email')).toBeVisible();
  await page.getByLabel('Email').fill('sam@example.test');
  await page.getByLabel('Password', { exact: true }).fill('river2026');
  await expect(page.getByText('At least 8 characters')).toBeVisible();

  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Please agree to the Terms and Privacy policy to continue')).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByText('Step 1 of 2')).toBeVisible();
  // Detected from the browser (Playwright runs with Europe/London).
  await expect(page.getByLabel('Your time zone')).toHaveValue('Europe/London');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('Step 2 of 2')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Connect your first account' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip for now' }).click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('heading', { name: 'Welcome, Sam' })).toBeVisible();
  expect(patches).toEqual([{ timezone: 'Europe/London' }, { onboardingCompleted: true }]);
});
