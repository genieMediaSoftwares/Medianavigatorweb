import { expect, test } from '@playwright/test';
import { mockApi, reply, shell, signIn, syncRun } from './fixtures';

test('sync a connected account and follow the run until it finishes', async ({ page, context, baseURL }) => {
  await signIn(context, baseURL!);
  let polls = 0;
  await mockApi(page, {
    ...shell({ connected: { instagram: 'synced' } }),
    'POST /connections/instagram/sync': () => reply.accepted({ syncRun: syncRun('queued'), alreadyQueued: false }),
    'GET /connections/sync-runs/run1': () => {
      polls += 1;
      return reply.ok(syncRun(polls < 2 ? 'running' : 'succeeded'));
    },
  });

  await page.goto('/connections');
  const card = page.locator('section#instagram');
  await expect(card.getByText('Connected', { exact: true })).toBeVisible();
  await expect(card.getByText('Not available from Instagram')).toHaveCount(0);

  await card.getByRole('button', { name: 'Sync now' }).click();
  await expect(card.getByText('Importing', { exact: true })).toBeVisible();
  await expect(card.getByText('Finished', { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(card.getByText('14 found · 2 new · 12 updated')).toBeVisible();
  await expect(page.getByText('Instagram import finished: 2 new, 12 updated.')).toBeVisible();
  expect(polls).toBeGreaterThanOrEqual(2);
});

test('shows the result of returning from a platform sign-in', async ({ page, context, baseURL }) => {
  await signIn(context, baseURL!);
  await mockApi(page, shell());
  await page.goto('/connections?oauth=denied&platform=youtube');
  await expect(page.getByRole('alert').filter({ hasText: "YouTube wasn't connected because access wasn't granted." })).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss' }).click();
  await expect(page).toHaveURL(/\/connections$/);
});
