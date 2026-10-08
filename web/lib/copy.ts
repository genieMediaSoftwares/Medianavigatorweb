/** Plain-language labels for values the API returns as codes. */
import type { Classification, ConnectionStatus, Platform, SyncRunStatus } from '@/types/api';

export const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
};

const CONTENT_TYPE_LABEL: Record<string, string> = {
  reel: 'Reel',
  short: 'Short',
  video: 'Video',
  post: 'Post',
  article: 'Article',
  carousel: 'Carousel',
};

/**
 * Format label. YouTube content is never called a Reel, and when the API says the type was inferred (YouTube has no
 * Shorts flag) the label says "estimated".
 */
export function formatLabel(contentType: string, basis?: string | null): string {
  const label = CONTENT_TYPE_LABEL[contentType] ?? contentType.charAt(0).toUpperCase() + contentType.slice(1);
  return basis === 'inferred' ? `${label} (estimated)` : label;
}

export const METRIC_LABEL: Record<string, string> = {
  views: 'Views',
  reach: 'Reach',
  likes: 'Likes',
  comments: 'Comments',
  shares: 'Shares',
  saves: 'Saves',
  watchTimeMinutes: 'Watch time',
};

export type Tone = 'good' | 'warn' | 'bad' | 'neutral' | 'info';

export const CONNECTION_STATUS: Record<ConnectionStatus, { label: string; tone: Tone }> = {
  not_connected: { label: 'Not connected', tone: 'neutral' },
  connecting: { label: 'Importing…', tone: 'info' },
  syncing: { label: 'Importing…', tone: 'info' },
  connected: { label: 'Connected', tone: 'good' },
  sync_complete: { label: 'Connected', tone: 'good' },
  permission_required: { label: 'Needs permission', tone: 'warn' },
  connection_expired: { label: 'Reconnect needed', tone: 'bad' },
  sync_failed: { label: 'Last import failed', tone: 'warn' },
};

export const SYNC_RUN_STATUS: Record<SyncRunStatus, { label: string; tone: Tone }> = {
  queued: { label: 'Waiting to start', tone: 'info' },
  running: { label: 'Importing', tone: 'info' },
  succeeded: { label: 'Finished', tone: 'good' },
  partial: { label: 'Finished with gaps', tone: 'warn' },
  failed: { label: 'Failed', tone: 'bad' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export const isRunFinished = (s: SyncRunStatus) => s === 'succeeded' || s === 'partial' || s === 'failed' || s === 'cancelled';

export const CLASSIFICATION: Record<Classification, { label: string; tone: Tone }> = {
  TOP: { label: 'Doing well', tone: 'good' },
  TYPICAL: { label: 'Typical', tone: 'info' },
  LOW: { label: 'Could be better', tone: 'warn' },
  INSUFFICIENT_DATA: { label: 'Not enough data yet', tone: 'neutral' },
};

export const ACCOUNT_TYPES = ['Creator', 'Personal brand', 'Business', 'E-commerce', 'Marketing agency', 'Other'] as const;

export const READ_ONLY_NOTE = "Media Navigator can only read your results. It can't post, edit or delete anything on your social accounts.";
