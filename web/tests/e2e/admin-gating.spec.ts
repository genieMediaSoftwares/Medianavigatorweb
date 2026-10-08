import { expect, test } from '@playwright/test';
import { mockApi, reply, shell, signIn } from './fixtures';

test('a regular user sees no admin entry and is turned away from /admin', async ({ page, context, baseURL }) => {
  await signIn(context, baseURL!);
  await mockApi(page, shell({ role: 'user' }));
  await page.goto('/home');
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'This area is for administrators' })).toBeVisible();
});

test('an admin (as reported by the server) gets the console', async ({ page, context, baseURL }) => {
  await signIn(context, baseURL!);
  await mockApi(page, {
    ...shell({ role: 'admin' }),
    'GET /admin/system': () => reply.ok({
      app: { environment: 'test', uptimeSeconds: 3600, node: 'v22' }, database: { status: 'connected' },
      counts: { users: 3, activeSessions: 2, contentItems: 40, aiCacheEntries: 0 },
      connectedAccountsByStatus: { sync_complete: 2 }, syncRunsByStatus: { succeeded: 5 },
      storage: { configured: false, files: 0, bytes: 0 },
      features: { ai: { configured: false, model: null }, email: { configured: false }, syncWorker: true, syncScheduler: true, oauth: { instagram: false } },
    }),
  });
  await page.goto('/admin');
  await expect(page.getByText('Every change you make here is recorded in the audit log.')).toBeVisible();
  await expect(page.getByText('Connected', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to app' })).toBeVisible();
});

test('private pages send signed-out visitors to sign in', async ({ page }) => {
  await page.goto('/insights/trends');
  await expect(page).toHaveURL(/\/sign-in\?next=%2Finsights%2Ftrends$/);
});
