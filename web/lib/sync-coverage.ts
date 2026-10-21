import type { Connection } from '@/types/api';

/**
 * What to say about how much of a profile is synced, from what the server recorded on the last sync. Mirrors
 * Frontend/src/features/analysis/syncCoverage.ts so the website and the mobile app tell the same story.
 */
export function syncCoverageNote(connection: Pick<Connection, 'platform' | 'name' | 'dataPointsCount' | 'accountInfo'>): { text: string; attention: boolean } | null {
  const n = (v: number) => v.toLocaleString('en-US');
  const name = connection.name;
  const synced = connection.dataPointsCount;
  const info = connection.accountInfo;
  const reported = typeof info?.mediaCount === 'number' ? info.mediaCount : undefined;
  const accessible = typeof info?.accessibleMediaCount === 'number' ? info.accessibleMediaCount : undefined;
  if (info?.mediaListComplete === false) {
    return { text: `The last sync couldn’t read every page of posts from ${name}. The ${n(synced)} posts already synced are kept. Sync again to fetch the rest.`, attention: true };
  }
  if (accessible !== undefined) {
    if (synced < accessible) return { text: `${n(accessible - synced)} of the ${n(accessible)} posts ${name} returned weren’t saved. Sync again to retry.`, attention: true };
    if (reported !== undefined && reported > accessible) {
      return { text: `All ${n(accessible)} posts ${name}’s API returns for this account are synced. The profile shows ${n(reported)}; the other ${n(reported - accessible)} aren’t available through ${name}’s API, so they can’t be imported.`, attention: false };
    }
    return null;
  }
  if (reported !== undefined && synced < reported) {
    return { text: `${name} reports ${n(reported)} posts on the profile and ${n(synced)} are synced.${connection.platform === 'instagram' ? ` Sync now to check how many ${name}’s API makes available.` : ''}`, attention: false };
  }
  return null;
}
