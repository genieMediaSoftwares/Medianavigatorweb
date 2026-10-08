import { expect, test } from '@playwright/test';
import { aiMeta, media, mockApi, reply, shell, signIn, summary } from './fixtures';

test('post detail with AI unavailable shows measured facts only', async ({ page, context, baseURL }) => {
  await signIn(context, baseURL!);
  await mockApi(page, {
    ...shell({ connected: { youtube: 'synced' } }),
    'GET /media': () => reply.ok([media()], { limit: 24, nextCursor: null }),
    'GET /media/yt_1': () => reply.ok(media()),
    'GET /intelligence/summary': () => reply.ok(summary()),
    'POST /intelligence/diagnose-post': () => reply.ok({
      mediaId: 'yt_1', status: 'average', statusBadge: 'Near your typical performance', headline: 'youtube short: typical',
      executiveSummary: 'Measured only (AI unavailable): engagement is 21.4% versus your median.',
      baselineComparison: '+21.4% engagement vs your median (4.2%, n=12)',
      metricBreakdown: { viewsAnalysis: '4,200 views (+35.5% vs your median of 3,100).', engagementHealth: '5.1% engagement from 190 likes, 24 comments.', commentVelocity: '24 comments.', shareabilityAnalysis: 'Shares are not exposed by this platform.' },
      suggestedHookAlternative: '', recommendedFormatAndTiming: 'Not enough history to recommend a publishing window.', actionableChecklist: [],
      source: 'Measured facts only (AI unavailable)', ai: aiMeta('unavailable'),
      limitations: ['Retention, watch time and audience data are only shown when the platform provides them.'],
      calculated: { classification: 'TYPICAL', comparedAgainst: '12 youtube posts', accountMedianEngagementPct: 4.2, engagementVsMedianPct: 21.4, accountMedianViews: 3100, viewsVsMedianPct: 35.5 },
    }),
  });

  await page.goto('/posts');
  await page.getByRole('button', { name: /open details for how i edit in 60 seconds/i }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.getByRole('region', { name: 'What we measured' })).toBeVisible();
  await expect(drawer.getByText('Not available from YouTube').first()).toBeVisible();
  await expect(drawer.getByText(/Short \(estimated\)/)).toBeVisible();
  await expect(drawer.getByRole('region', { name: 'What we calculated' })).toContainText('Based on 12 posts');

  await drawer.getByRole('button', { name: 'Explain this post' }).click();
  await expect(drawer.getByRole('note').filter({ hasText: "AI explanation isn't available right now" })).toBeVisible();
  await expect(drawer.getByText('+21.4% engagement vs your median (4.2%, n=12)')).toBeVisible();
  await expect(drawer.getByText(/Explained by AI/)).toHaveCount(0);
});
