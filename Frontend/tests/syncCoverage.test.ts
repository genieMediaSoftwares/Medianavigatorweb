import { describe, expect, it } from 'vitest';

import { syncCoverage, syncCoverageText } from '@/features/analysis/syncCoverage';

const ig = (dataPointsCount: number, accountInfo: Record<string, unknown>) => ({ platform: 'instagram' as const, dataPointsCount, accountInfo: { id: '1', ...accountInfo } });

describe('sync coverage message', () => {
  it('explains a verified API limit without claiming posts can still be fetched', () => {
    const c = syncCoverage(ig(424, { mediaCount: 435, accessibleMediaCount: 424, mediaListComplete: true }));
    expect(c).toMatchObject({ kind: 'complete', limited: true });
    const t = syncCoverageText(c, 'Instagram');
    expect(t.headline).toBe('All 424 available posts synced');
    expect(t.note).toContain('its API returns 424');
    expect(t.note).toContain('other 11 aren’t available');
    expect(t.note).not.toMatch(/sync now/i);
    expect(t.attention).toBe(false);
  });

  it('says nothing extra when everything on the profile is synced', () => {
    const t = syncCoverageText(syncCoverage(ig(435, { mediaCount: 435, accessibleMediaCount: 435, mediaListComplete: true })), 'Instagram');
    expect(t).toEqual({ headline: 'All 435 posts synced', note: null, attention: false });
  });

  it('flags a listing the last sync could not finish, and keeps what was synced', () => {
    const t = syncCoverageText(syncCoverage(ig(300, { mediaCount: 435, accessibleMediaCount: null, mediaListComplete: false })), 'Instagram');
    expect(t.attention).toBe(true);
    expect(t.note).toContain('couldn’t read every page');
  });

  it('flags returned posts that were not stored', () => {
    const t = syncCoverageText(syncCoverage(ig(420, { mediaCount: 435, accessibleMediaCount: 424, mediaListComplete: true })), 'Instagram');
    expect(t.attention).toBe(true);
    expect(t.note).toContain('4 posts Instagram returned weren’t saved');
  });

  it('does not invent an explanation before the API listing has been checked', () => {
    const t = syncCoverageText(syncCoverage(ig(424, { mediaCount: 435 })), 'Instagram');
    expect(t.attention).toBe(false);
    expect(t.note).not.toMatch(/stories|deleted|can’t be imported/i);
    expect(t.note).toContain('Sync now to check');
    const yt = syncCoverageText(syncCoverage({ platform: 'youtube', dataPointsCount: 90, accountInfo: { id: '1', mediaCount: 100 } }), 'YouTube');
    expect(yt.note).not.toMatch(/sync now/i);
  });
});
