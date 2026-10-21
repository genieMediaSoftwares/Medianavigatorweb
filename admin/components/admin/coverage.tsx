import type { AdminConnection } from '@/types/api';
import { dateTime, whole } from '@/lib/format';
import { statusLabel } from './shared';

/**
 * Synced posts against what the platform's API returned and what the profile reports, exactly as the last sync recorded
 * them. Unknown numbers are said to be unknown; a profile count above the API count is not presented as fetchable.
 */
export function CoverageCell({ c }: { c: AdminConnection }) {
  const v = c.coverage;
  const details = [
    v.accessibleCount !== null ? `${whole(v.accessibleCount)} returned by API` : null,
    v.profileCount !== null ? `${whole(v.profileCount)} on profile` : null,
  ].filter(Boolean).join(' · ');
  const notOnApi = v.listingComplete && v.accessibleCount !== null && v.profileCount !== null ? v.profileCount - v.accessibleCount : 0;
  return (
    <div className="space-y-0.5">
      <p className="font-semibold tabular text-ink">{whole(v.syncedCount)} synced</p>
      {details && <p className="text-xs text-muted tabular">{details}</p>}
      {v.listingComplete === false && <p className="text-xs font-semibold text-warn">Last listing incomplete: sync again</p>}
      {v.listingComplete && v.accessibleCount !== null && v.syncedCount < v.accessibleCount && <p className="text-xs font-semibold text-warn">{whole(v.accessibleCount - v.syncedCount)} returned but not stored</p>}
      {notOnApi > 0 && <p className="text-xs text-muted">{whole(notOnApi)} not available through the API</p>}
      {v.listingComplete === null && v.accessibleCount === null && <p className="text-xs text-subtle">API coverage not recorded</p>}
    </div>
  );
}

export function AudienceCell({ c }: { c: AdminConnection }) {
  const parts = [
    c.coverage.followersCount !== null ? `${whole(c.coverage.followersCount)} followers` : null,
    c.coverage.followsCount !== null ? `${whole(c.coverage.followsCount)} following` : null,
  ].filter(Boolean);
  return parts.length ? <span className="tabular">{parts.join(' · ')}</span> : <span className="text-subtle">Not reported</span>;
}

export function LastAttemptCell({ c }: { c: AdminConnection }) {
  if (!c.lastRun) return <span className="text-subtle">No attempts</span>;
  return (
    <div className="space-y-0.5">
      <p>{statusLabel(c.lastRun.status)} · {statusLabel(c.lastRun.type)}</p>
      <p className="text-xs text-muted">{dateTime(c.lastRun.completedAt ?? c.lastRun.queuedAt)}{c.lastRun.errorKind ? ` · ${statusLabel(c.lastRun.errorKind)}` : ''}</p>
    </div>
  );
}
