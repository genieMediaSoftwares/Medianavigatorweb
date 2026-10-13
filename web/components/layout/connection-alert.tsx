'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { statusView } from '@/lib/connection-status';
import { useConnections } from '@/lib/hooks/useQueries';
import { platformName } from '@/lib/platforms';

/**
 * A connection that needs the user (expired login, missing permission) silently breaks syncing and analysis.
 * Say so on every page, with one action, instead of letting them find out inside a failed report.
 */
export function ConnectionAlert() {
  const pathname = usePathname();
  const { data } = useConnections();
  if (pathname.startsWith('/connections')) return null;
  const broken = (data ?? []).filter((c) => c.connected && statusView(c, false).needsAction);
  if (broken.length === 0) return null;
  const names = broken.map((c) => platformName(c.platform)).join(' and ');
  const expired = broken.some((c) => c.status === 'connection_expired');
  return (
    <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-transparent bg-warn-bg px-4 py-3 text-sm text-warn">
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        <strong>{names} needs your attention.</strong> {expired ? 'The saved login has expired, so new posts and video analysis are paused.' : 'More permission is needed before we can read its posts.'}
      </p>
      <Link href="/connections" className="shrink-0 font-semibold underline underline-offset-2">Fix in Connections</Link>
    </div>
  );
}
