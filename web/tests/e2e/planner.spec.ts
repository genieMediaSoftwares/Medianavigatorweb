import { expect, test } from '@playwright/test';
import { mockApi, reply, shell, signIn } from './fixtures';

test('add a planned post and delete it after confirming', async ({ page, context, baseURL }) => {
  await signIn(context, baseURL!);
  let items: Array<Record<string, unknown>> = [];
  await mockApi(page, {
    ...shell({ connected: { instagram: 'synced' } }),
    'GET /planner': () => reply.ok(items),
    'GET /planner/insights': () => reply.ok({ timezone: 'Europe/London', hasEnoughData: false, bestWindows: [], contentGaps: [], basedOn: { posts: 2 } }),
    'POST /planner': (body) => {
      const item = { id: 'p1', status: 'scheduled', isRecommended: false, ...(body as object) };
      items = [item];
      return reply.created(item);
    },
    'DELETE /planner/p1': () => {
      items = [];
      return reply.ok({ id: 'p1' });
    },
  });

  await page.goto('/plan/planner?day=Tuesday&time=18:00');
  // Role queries skip the hidden streaming placeholder Next leaves in the HTML.
  await expect(page.getByRole('note').filter({ hasText: "Media Navigator doesn't publish for you." })).toBeVisible();
  await expect(page.getByText('Nothing planned yet')).toBeVisible();

  const form = page.getByRole('region', { name: 'Add a post' }).or(page.locator('form').filter({ has: page.getByRole('button', { name: 'Add to planner' }) }));
  await form.getByLabel('Title').fill('Behind the scenes reel');
  await expect(form.getByLabel('Day')).toHaveValue('Tuesday');
  await expect(form.getByLabel('Time')).toHaveValue('18:00');
  await form.getByLabel('Format').selectOption('reel');
  await form.getByRole('button', { name: 'Add to planner' }).click();

  await expect(page.getByText('Behind the scenes reel')).toBeVisible();
  await page.getByRole('button', { name: 'Remove Behind the scenes reel' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Nothing on your social accounts changes.');
  await dialog.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText('Nothing planned yet')).toBeVisible();
});
