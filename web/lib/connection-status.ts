import type { Connection } from '@/types/api';
import type { Tone } from '@/components/ui/badge';

export interface StatusView { label: string; tone: Tone; needsAction: boolean }

/** Plain words for every connection state. */
export function statusView(c: Connection | undefined, syncing: boolean): StatusView {
  if (!c || !c.connected) return { label: 'Not connected', tone: 'neutral', needsAction: false };
  if (syncing || c.status === 'syncing' || c.status === 'connecting') return { label: 'Importing…', tone: 'brand', needsAction: false };
  switch (c.status) {
    case 'permission_required': return { label: 'Needs permission', tone: 'warn', needsAction: true };
    case 'connection_expired': return { label: 'Reconnect needed', tone: 'bad', needsAction: true };
    case 'sync_failed': return { label: 'Update failed', tone: 'bad', needsAction: false };
    default: return { label: 'Connected', tone: 'good', needsAction: false };
  }
}

/** The API's `statusMessage` is only a useful explanation when something is wrong; otherwise it is boilerplate. */
export function problemMessage(c: Connection): string | null {
  if (c.status === 'permission_required') return c.statusMessage || 'This account needs more permission before we can read its posts.';
  if (c.status === 'connection_expired') return 'The saved access has expired. Reconnect to keep your numbers up to date.';
  if (c.status === 'sync_failed') return c.sync?.lastError || c.statusMessage || 'The last update didn’t finish.';
  return null;
}
