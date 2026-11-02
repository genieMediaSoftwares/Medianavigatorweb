import { expect, test } from '@playwright/test';
import { creds, signIn } from './helpers';

test.skip(process.env.LOCAL_ACCEPTANCE !== '1', 'Requires the disposable loopback acceptance server');

test('empty-account navigation, private cookies and public deletion page work at mobile widths', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  const cookies = await context.cookies();
  expect(cookies.filter((cookie) => ['mn_at', 'mn_rt'].includes(cookie.name))).toHaveLength(2);
  expect(cookies.filter((cookie) => ['mn_at', 'mn_rt'].includes(cookie.name)).every((cookie) => cookie.httpOnly)).toBe(true);
  expect(await page.evaluate(() => document.cookie)).not.toMatch(/mn_at|mn_rt/);
  for (const path of ['/connections', '/posts', '/settings']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.goto('/data-deletion');
  await expect(page.getByRole('heading', { name: 'Delete your data', exact: true })).toBeVisible();
});

test('separate admin allows staff and refuses a normal account in both UI and API', async ({ browser }) => {
  const origin = process.env.LOCAL_ADMIN_ORIGIN!;
  expect(new URL(origin).hostname).toBe('127.0.0.1');
  for (const role of ['admin', 'user'] as const) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const { email, password } = creds(role);
    await page.goto(`${origin}/sign-in`);
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in securely' }).click();
    if (role === 'admin') {
      await expect(page).toHaveURL(/\/admin$/);
      await expect(page.getByRole('heading', { name: 'Admin command center' })).toBeVisible();
      await page.getByRole('tab', { name: 'Users', exact: true }).click();
      await expect(page.getByText('acceptance-user@test.example', { exact: true })).toBeVisible();
    } else {
      await expect(page).toHaveURL(/\/sign-in$/);
      await expect(page.getByRole('alert')).toBeVisible();
      // The admin proxy refuses nonstaff login before it issues a session cookie.
      expect((await context.cookies()).filter((cookie) => ['mn_at', 'mn_rt'].includes(cookie.name))).toHaveLength(0);
    }
    const response = await page.request.get(`${origin}/api/v1/admin/users`);
    expect(response.status()).toBe(role === 'admin' ? 200 : 401);
    await context.close();
  }
});
