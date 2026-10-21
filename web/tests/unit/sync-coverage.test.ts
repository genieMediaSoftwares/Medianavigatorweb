import { describe, expect, it } from 'vitest';
import { syncCoverageNote } from '@/lib/sync-coverage';

const ig = (dataPointsCount: number, accountInfo: Record<string, unknown>) => ({ platform: 'instagram' as const, name: 'Instagram', dataPointsCount, accountInfo: { id: '1', ...accountInfo } });

describe('web sync coverage note', () => {
  it('matches the mobile wording for a verified API limit', () => {
    const note = syncCoverageNote(ig(424, { mediaCount: 435, accessibleMediaCount: 424, mediaListComplete: true }));
    expect(note?.attention).toBe(false);
    expect(note?.text).toContain('All 424 posts Instagram’s API returns for this account are synced');
    expect(note?.text).toContain('other 11');
  });
  it('warns when the last listing was incomplete', () => {
    expect(syncCoverageNote(ig(300, { mediaCount: 435, mediaListComplete: false }))?.attention).toBe(true);
  });
  it('stays silent when the profile is fully synced', () => {
    expect(syncCoverageNote(ig(435, { mediaCount: 435, accessibleMediaCount: 435, mediaListComplete: true }))).toBeNull();
  });
  it('does not explain an unchecked difference', () => {
    const note = syncCoverageNote(ig(424, { mediaCount: 435 }));
    expect(note?.text).not.toMatch(/can’t be imported|stories|deleted/i);
  });
});
