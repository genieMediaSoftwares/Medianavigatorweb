'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Lock, RefreshCw, ShieldCheck, Trash2, XCircle } from 'lucide-react';
import { connectionsApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import { PLATFORM_LABEL, READ_ONLY_NOTE } from '@/lib/copy';
import { connectedOnly, useConnections } from '@/lib/hooks';
import { useSync } from '@/components/providers/AppContext';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { CardsSkeleton, ErrorState, errorMessage } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { ConnectionCard } from '@/components/connections/ConnectionCard';
import { PLATFORMS } from '@/lib/api/schemas';
import type { Platform } from '@/types/api';

type OAuthResult = { outcome: 'connected' | 'denied' | 'failed'; platform: Platform | null };

export function ConnectionsView() {
  const connections = useConnections();
  const { runs, active, track } = useSync();
  const client = useQueryClient();
  const toast = useToast();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // The API sends the browser back here after the platform's sign-in: ?oauth=connected|denied|failed&platform=…
  const outcome = params.get('oauth');
  const oauth: OAuthResult | null = outcome === 'connected' || outcome === 'denied' || outcome === 'failed'
    ? { outcome, platform: PLATFORMS.find((x) => x === params.get('platform')) ?? null }
    : null;
  useEffect(() => {
    if (outcome === 'connected') void client.invalidateQueries({ queryKey: qk.connections });
  }, [outcome, client]);

  const syncAll = useMutation({
    mutationFn: connectionsApi.syncAll,
    onSuccess: (r) => {
      track(r.syncRuns);
      toast(r.syncRuns.length ? 'Importing all your channels…' : 'Nothing to import right now.');
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const anyConnected = connectedOnly(connections.data).length > 0;
  const latestRun = (p: Platform) => runs.find((r) => r.platform === p);

  return (
    <>
      <PageHeader
        title="Connections"
        description="Connect the channels you want us to look at. You can disconnect at any time."
        action={anyConnected ? (
          <Button variant="secondary" loading={syncAll.isPending} disabled={active.length > 0} icon={<RefreshCw className="size-4" aria-hidden />} onClick={() => syncAll.mutate()}>
            {active.length > 0 ? 'Importing…' : 'Sync all'}
          </Button>
        ) : undefined}
      />

      {oauth ? <OAuthBanner result={oauth} onClose={() => router.replace(pathname, { scroll: false })} /> : null}

      {connections.isPending ? (
        <CardsSkeleton count={4} className="lg:grid-cols-2" />
      ) : connections.isError ? (
        <ErrorState error={connections.error} onRetry={() => connections.refetch()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {connections.data.map((c) => <ConnectionCard key={c.platform} connection={c} run={latestRun(c.platform)} />)}
        </div>
      )}

      <Card className="mt-8">
        <h2 className="text-lg font-semibold">How access works</h2>
        <ul className="mt-3 grid gap-4 sm:grid-cols-3">
          <li className="flex gap-3"><ShieldCheck className="size-5 shrink-0 text-action" aria-hidden /><p className="text-[15px] text-ink-muted"><span className="font-semibold text-ink">Read-only. </span>{READ_ONLY_NOTE}</p></li>
          <li className="flex gap-3"><Lock className="size-5 shrink-0 text-action" aria-hidden /><p className="text-[15px] text-ink-muted"><span className="font-semibold text-ink">Encrypted. </span>Access keys are encrypted on our server and never sent to your browser.</p></li>
          <li className="flex gap-3"><Trash2 className="size-5 shrink-0 text-action" aria-hidden /><p className="text-[15px] text-ink-muted"><span className="font-semibold text-ink">Yours to remove. </span>Disconnecting deletes the saved access right away. Past results stay until you delete your account.</p></li>
        </ul>
      </Card>
    </>
  );
}

function OAuthBanner({ result, onClose }: { result: OAuthResult; onClose: () => void }) {
  const name = result.platform ? PLATFORM_LABEL[result.platform] : 'The platform';
  const ok = result.outcome === 'connected';
  const text = ok
    ? `${name} is connected. We're importing your posts now; this can take a few minutes.`
    : result.outcome === 'denied'
      ? `${name} wasn't connected because access wasn't granted. You can try again whenever you're ready.`
      : `We couldn't finish connecting ${name}. Please try again. If it keeps happening, use "Advanced" to connect with a token.`;
  return (
    <div role={ok ? 'status' : 'alert'} className={`mb-6 flex items-start gap-3 rounded-xl px-4 py-3 text-[15px] ${ok ? 'bg-good-bg text-good-fg' : 'bg-warn-bg text-warn-fg'}`}>
      {ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden /> : <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden />}
      <p className="flex-1">{text}</p>
      <button type="button" onClick={onClose} className="-my-2 min-h-11 font-semibold underline">Dismiss</button>
    </div>
  );
}
