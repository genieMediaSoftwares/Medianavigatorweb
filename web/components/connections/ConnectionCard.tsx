'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ChevronDown, RefreshCw } from 'lucide-react';
import { connectionsApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import { CONNECTION_STATUS, PLATFORM_LABEL, SYNC_RUN_STATUS } from '@/lib/copy';
import { formatCompact, timeAgo } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { errorMessage } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useSync } from '@/components/providers/AppContext';
import { OAuthConnectButton, TokenConnectForm } from './ConnectActions';
import type { Connection, SyncRun } from '@/types/api';

const problemText = (c: Connection): string | null => {
  if (c.status === 'connection_expired') return c.statusMessage || `Your ${c.name} access has expired. Reconnect to keep your results up to date.`;
  if (c.status === 'permission_required') return c.statusMessage || `${c.name} needs one more permission before we can read your posts.`;
  if (c.status === 'sync_failed') return c.sync.lastError || 'The last import did not finish. Try "Sync now".';
  return null;
};

export function ConnectionCard({ connection: c, run }: { connection: Connection; run?: SyncRun }) {
  const client = useQueryClient();
  const toast = useToast();
  const { track } = useSync();
  const [confirm, setConfirm] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const status = CONNECTION_STATUS[c.status];
  const problem = problemText(c);
  const needsReconnect = c.status === 'connection_expired' || c.status === 'permission_required';
  const oauth = Boolean(c.oauthAvailable);

  const sync = useMutation({
    mutationFn: () => connectionsApi.sync(c.platform),
    onSuccess: (r) => {
      track([r.syncRun]);
      toast(r.alreadyQueued ? `${c.name} is already importing.` : `Importing ${c.name}…`);
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  const disconnect = useMutation({
    mutationFn: () => connectionsApi.disconnect(c.platform),
    onSuccess: () => {
      setConfirm(false);
      void client.invalidateQueries({ queryKey: qk.connections });
      void client.invalidateQueries({ queryKey: qk.intelligence });
      void client.invalidateQueries({ queryKey: ['media'] });
      toast(`${c.name} disconnected.`);
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const updated = timeAgo(c.sync.lastSyncedAt);
  const followers = c.accountInfo?.followersCount;

  return (
    <section id={c.platform} className="card scroll-mt-24 rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]" aria-labelledby={`${c.platform}-title`}>
      <div className="flex flex-wrap items-start gap-4">
        <PlatformIcon platform={c.platform} decorative className="size-10" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={`${c.platform}-title`} className="text-lg font-semibold">{c.name}</h2>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          {c.connected ? <p className="truncate text-ink-muted">{c.accountHandle}</p> : <p className="text-ink-muted">Not connected yet.</p>}
        </div>
      </div>

      {c.connected ? (
        <dl className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-surface-2 p-3 text-center">
          <div>
            <dt className="text-xs font-semibold text-ink-muted">Posts imported</dt>
            <dd className="text-lg font-semibold">{formatCompact(c.dataPointsCount)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-ink-muted">Followers</dt>
            <dd className={followers === undefined || followers === null ? 'pt-1 text-xs text-ink-subtle' : 'text-lg font-semibold'}>
              {followers === undefined || followers === null ? `Not available from ${PLATFORM_LABEL[c.platform]}` : formatCompact(followers)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-ink-muted">Updated</dt>
            <dd className="pt-1 text-sm font-semibold">{updated ?? 'Not yet'}</dd>
          </div>
        </dl>
      ) : null}

      {problem ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-warn-bg px-3 py-2.5 text-[15px] text-warn-fg" role="note">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{problem}</span>
        </p>
      ) : null}

      {run ? <RunProgress run={run} /> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {!c.connected || needsReconnect ? (
          oauth ? (
            <OAuthConnectButton platform={c.platform} label={c.connected ? 'Reconnect' : `Connect ${c.name}`} />
          ) : (
            <Button onClick={() => setAdvancedOpen(true)}>{c.connected ? 'Reconnect' : `Connect ${c.name}`}</Button>
          )
        ) : null}
        {c.connected && c.status !== 'connection_expired' ? (
          <Button variant="secondary" icon={<RefreshCw className="size-4" aria-hidden />} loading={sync.isPending} onClick={() => sync.mutate()}>
            Sync now
          </Button>
        ) : null}
        {c.connected ? <Button variant="ghost" onClick={() => setConfirm(true)}>Disconnect</Button> : null}
      </div>

      <details className="mt-4 group" open={advancedOpen} onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}>
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-[15px] font-semibold text-ink-muted hover:text-ink">
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
          Advanced: connect with an access token
        </summary>
        <div className="mt-3 rounded-xl border border-line p-4">
          <TokenConnectForm connection={c} onDone={() => setAdvancedOpen(false)} />
        </div>
      </details>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Disconnect ${c.name}?`}
        consequence="We'll delete the saved access. Your past results stay."
        confirmLabel="Disconnect"
        onConfirm={() => disconnect.mutate()}
        pending={disconnect.isPending}
      />
    </section>
  );
}

export function RunProgress({ run }: { run: SyncRun }) {
  const s = SYNC_RUN_STATUS[run.status];
  const working = run.status === 'queued' || run.status === 'running';
  return (
    <div className="mt-4 rounded-xl border border-line p-3" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone={s.tone} icon={working ? <RefreshCw className="size-3.5 animate-spin" aria-hidden /> : undefined}>{s.label}</Badge>
        <p className="text-sm text-ink-muted">
          {run.items.fetched} found · {run.items.created} new · {run.items.updated} updated{run.items.failed ? ` · ${run.items.failed} could not be read` : ''}
        </p>
      </div>
      {run.status === 'partial' ? (
        <p className="mt-2 text-sm text-warn-fg">Partial result: the platform didn&apos;t return everything{run.errorSummary ? ` (${run.errorSummary})` : ''}. Some numbers may be missing until the next import.</p>
      ) : run.status === 'failed' && run.errorSummary ? (
        <p className="mt-2 text-sm text-bad-fg">{run.errorSummary}</p>
      ) : null}
    </div>
  );
}
