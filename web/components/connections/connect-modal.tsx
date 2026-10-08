'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Lock, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { PlatformTile } from '@/components/ui/platform-logo';
import { Notice } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { useSync } from '@/lib/hooks/useSync';
import { platformName } from '@/lib/platforms';
import { qk } from '@/lib/queryKeys';
import type { Connection, ConnectInput, Platform } from '@/types/api';

/** Optional extras the token form can take, per platform. */
const EXTRA: Record<Platform, { key: keyof ConnectInput; label: string; hint: string } | null> = {
  instagram: { key: 'accountId', label: 'Instagram account ID', hint: 'Only if your token has more than one account.' },
  facebook: { key: 'pageId', label: 'Facebook Page ID', hint: 'Choose which Page to read when your token has several.' },
  youtube: { key: 'channelQuery', label: 'Channel handle or link', hint: 'For example @YourChannel. Leave empty to use the channel your token belongs to.' },
  linkedin: { key: 'organizationId', label: 'Company Page ID', hint: 'The number of the Company Page you manage.' },
};

const PERMISSIONS = ['Read your posts and videos', 'Read their public numbers (views, likes, comments)', 'Read your account name and follower count'];

const schema = z.object({ secret: z.string().trim().min(10, 'That looks too short to be an access token'), extra: z.string().trim().max(200).optional() });
type Values = z.infer<typeof schema>;

export function ConnectModal({ platform, connection, open, onOpenChange, onConnected }: { platform: Platform; connection?: Connection; open: boolean; onOpenChange: (o: boolean) => void; onConnected?: () => void }) {
  const name = platformName(platform);
  const qc = useQueryClient();
  const toast = useToast();
  const sync = useSync();
  const oauth = Boolean(connection?.oauthAvailable);
  const [advanced, setAdvanced] = useState(!oauth);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), mode: 'onTouched' });
  const extra = EXTRA[platform];

  const startOAuth = async () => {
    setBusy(true); setError(null);
    try { const { authorizeUrl } = await api.startOAuth(platform); window.location.assign(authorizeUrl); }
    catch (e) { setError(e instanceof ApiError ? e.message : `We couldn’t start the ${name} sign-in.`); setBusy(false); }
  };

  const submit = handleSubmit(async (v) => {
    setError(null);
    const body: ConnectInput = platform === 'youtube' && !v.secret.startsWith('ya29') ? { apiKey: v.secret } : { accessToken: v.secret };
    if (extra && v.extra) body[extra.key] = v.extra;
    try {
      await api.connect(platform, body);
      await qc.invalidateQueries({ queryKey: qk.connections });
      toast.success(`${name} is connected. We’re importing your posts now.`);
      reset(); onOpenChange(false); onConnected?.();
      void sync.start(platform).catch(() => undefined);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 409 ? `That ${name} account is already connected to another Media Navigator account.` : e instanceof ApiError ? e.message : `We couldn’t connect ${name}. Please try again.`);
    }
  });

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`Connect ${name}`} description="Read-only. Media Navigator can’t post, edit or delete anything.">
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-xl border border-line bg-app p-3"><PlatformTile platform={platform} /><p className="text-sm text-muted">We&apos;ll ask {name} for permission to:</p></div>
        <ul className="space-y-2 text-sm text-text">{PERMISSIONS.map((p) => <li key={p} className="flex gap-2.5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-good" aria-hidden="true" />{p}</li>)}</ul>
        <p className="flex gap-2.5 text-[13px] text-muted"><Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />Your access is encrypted on our server and deleted when you disconnect.</p>

        {error && <Notice tone="bad">{error}</Notice>}

        {oauth && <Button size="lg" className="w-full" loading={busy} onClick={() => void startOAuth()}>Continue with {name}</Button>}
        {!oauth && <Notice>One-click sign-in with {name} isn&apos;t set up on this server yet. You can still connect with an access token below.</Notice>}

        {oauth && (
          <button type="button" onClick={() => setAdvanced((a) => !a)} aria-expanded={advanced} className="flex w-full items-center justify-between rounded-xl px-1 py-2 text-sm font-semibold text-muted hover:text-ink">
            Advanced: use an access token instead<ChevronDown className={`h-4 w-4 transition-transform ${advanced ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        )}
        {advanced && (
          <form onSubmit={submit} noValidate className="space-y-4 rounded-xl border border-line p-4">
            <Field label={platform === 'youtube' ? 'Access token or API key' : 'Access token'} error={errors.secret?.message} hint="Paste it here once. We never show it again.">{(p) => <Input type="password" autoComplete="off" spellCheck={false} {...p} {...register('secret')} />}</Field>
            {extra && <Field label={extra.label} optional hint={extra.hint} error={errors.extra?.message}>{(p) => <Input autoComplete="off" {...p} {...register('extra')} />}</Field>}
            <Button type="submit" variant={oauth ? 'secondary' : 'primary'} size="lg" className="w-full" loading={isSubmitting}>Connect with token</Button>
          </form>
        )}
      </div>
    </Modal>
  );
}
