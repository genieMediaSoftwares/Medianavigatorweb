import type { Connection } from '@/types/api';

/**
 * What the sync box says about how much of a profile is synced. Every message is backed by what the server recorded on
 * the last sync; nothing is inferred by subtracting counts alone.
 */
export type SyncCoverage =
  /** Everything the platform's API returned is synced; `limited` = the profile count is higher than that. */
  | { kind: 'complete'; synced: number; accessible: number; reported: number; limited: boolean }
  /** The last sync could not read the platform's whole post listing; what was read is kept. */
  | { kind: 'incomplete'; synced: number; reported?: number }
  /** The API returned posts that are not stored yet. */
  | { kind: 'behind'; synced: number; accessible: number }
  /** The profile count differs from what is synced, and the API listing has not been checked yet. */
  | { kind: 'unverified'; synced: number; reported: number; canCheck: boolean }
  | { kind: 'none' };

export function syncCoverage(connection: Pick<Connection, 'platform' | 'dataPointsCount' | 'accountInfo'>): SyncCoverage {
  const synced = connection.dataPointsCount;
  const info = connection.accountInfo;
  const reported = typeof info?.mediaCount === 'number' ? info.mediaCount : undefined;
  const accessible = typeof info?.accessibleMediaCount === 'number' ? info.accessibleMediaCount : undefined;
  if (info?.mediaListComplete === false) return { kind: 'incomplete', synced, reported };
  if (accessible !== undefined) {
    if (synced < accessible) return { kind: 'behind', synced, accessible };
    return { kind: 'complete', synced, accessible, reported: reported ?? accessible, limited: reported !== undefined && reported > accessible };
  }
  // Only Instagram syncs record what the API listing returned, so only there does a new sync settle the question.
  if (reported !== undefined && synced < reported) return { kind: 'unverified', synced, reported, canCheck: connection.platform === 'instagram' };
  return { kind: 'none' };
}

/** The sync box's headline and, when there is something to explain, a note and whether it needs attention. */
export function syncCoverageText(coverage: SyncCoverage, name: string): { headline: string | null; note: string | null; attention: boolean } {
  const n = (v: number) => v.toLocaleString();
  switch (coverage.kind) {
    case 'complete':
      return coverage.limited
        ? {
            headline: `All ${n(coverage.accessible)} available posts synced`,
            note: `${name} shows ${n(coverage.reported)} posts on the profile, but its API returns ${n(coverage.accessible)} for this account. All of those are synced; the other ${n(coverage.reported - coverage.accessible)} aren’t available through ${name}’s API, so they can’t be imported.`,
            attention: false,
          }
        : { headline: `All ${n(coverage.accessible)} posts synced`, note: null, attention: false };
    case 'incomplete':
      return {
        headline: coverage.reported !== undefined ? `${n(coverage.synced)} of ${n(coverage.reported)} profile posts synced` : null,
        note: `The last sync couldn’t read every page of posts from ${name}. The ${n(coverage.synced)} posts already synced are kept. Sync again to fetch the rest.`,
        attention: true,
      };
    case 'behind':
      return {
        headline: `${n(coverage.synced)} of ${n(coverage.accessible)} available posts synced`,
        note: `${n(coverage.accessible - coverage.synced)} posts ${name} returned weren’t saved. Sync again to retry.`,
        attention: true,
      };
    case 'unverified':
      return {
        headline: `${n(coverage.synced)} of ${n(coverage.reported)} profile posts synced`,
        note: `${name} reports ${n(coverage.reported)} posts on the profile and ${n(coverage.synced)} are synced.${coverage.canCheck ? ` Sync now to check how many ${name}’s API makes available.` : ''}`,
        attention: false,
      };
    default:
      return { headline: null, note: null, attention: false };
  }
}
