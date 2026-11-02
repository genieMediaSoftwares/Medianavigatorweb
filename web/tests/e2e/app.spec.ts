import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.describe('signed-in user', () => {
  test.beforeEach(async ({ page }) => { await signIn(page, 'user'); });

  test('Posts shows a tidy grid and the post detail keeps measured, calculated and interpretation apart, with honest AI status', async ({ page }) => {
    await page.goto('/posts');
    const first = page.getByRole('button', { name: /views|Morning|Behind|Three|Customer|New arrival/i }).first();
    await expect(first).toBeVisible();
    await first.click();
    await expect(page.getByText('What we measured')).toBeVisible();
    await page.getByRole('button', { name: /Explain this post/i }).click();
    await expect(page.getByText('What we calculated')).toBeVisible();
    await expect(page.getByText('What it may mean')).toBeVisible();
    // When no AI is configured the page must say so rather than imply AI wrote the explanation.
    const unavailable = page.getByText(/AI explanation isn.t available right now/i);
    const aiRan = page.getByText(/Written with AI/i);
    await expect(unavailable.or(aiRan)).toBeVisible();
  });

  test('Sync now polls the update and settles back to idle with a message', async ({ page }) => {
    await page.goto('/connections');
    const sync = page.getByRole('button', { name: 'Sync now' }).first();
    await sync.click();
    await expect(page.getByRole('status').filter({ hasText: /Importing|Waiting/ }).or(page.getByText(/up to date|could not be updated|could not be read/))).toBeVisible();
    await expect(sync).toBeEnabled({ timeout: 60_000 });
  });

  test('Plan: add an idea to the planner and remove it again', async ({ page }) => {
    await page.goto('/plan?tab=planner');
    await page.getByRole('button', { name: /Add/ }).first().click();
    await page.getByLabel(/Title/).fill('E2E planner idea');
    await page.getByLabel(/Time/).fill('6:00 PM');
    await page.getByRole('button', { name: /^Add to planner$|^Save$/ }).click();
    await expect(page.getByText('E2E planner idea')).toBeVisible();
    await page.getByRole('button', { name: /Remove E2E planner idea|Delete/ }).first().click();
    await page.getByRole('button', { name: /^Remove$|^Delete$/ }).click();
    await expect(page.getByText('E2E planner idea')).toBeHidden();
  });

  test('the website has no admin console for a normal user', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Administration has moved' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Users' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);
  });
});

// Administration is the separate admin app (admin/). Its permission and self-action rules are enforced by the API
// (backend/tests/admin*.test.ts) and covered by admin/tests. The website itself must never render customer data.
test('even for an administrator the website only points to the separate admin app', async ({ page }) => {
  await signIn(page, 'admin');
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Administration has moved' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open the admin panel' }).or(page.getByRole('status'))).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Users' })).toHaveCount(0);
  await expect(page.getByRole('table')).toHaveCount(0);
});
