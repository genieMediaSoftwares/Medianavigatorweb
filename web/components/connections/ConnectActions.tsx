'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { connectionsApi, type ConnectBody } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import { PLATFORM_LABEL } from '@/lib/copy';
import { Button } from '@/components/ui/Button';
import { PasswordField, SelectField, TextField } from '@/components/ui/Field';
import { FormError, errorMessage } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useSync } from '@/components/providers/AppContext';
import type { Connection, Platform } from '@/types/api';

/** One-click connect through the platform's own sign-in page. The API returns where to send the browser. */
export function OAuthConnectButton({ platform, label, variant = 'primary', className, beforeRedirect }: {
  platform: Platform; label?: string; variant?: 'primary' | 'secondary'; className?: string;
  /** Runs before leaving for the platform's sign-in page (the API always returns the browser to /connections). */
  beforeRedirect?: () => Promise<unknown>;
}) {
  const toast = useToast();
  const start = useMutation({
    mutationFn: async () => {
      const r = await connectionsApi.oauthStart(platform);
      await beforeRedirect?.();
      return r;
    },
    onSuccess: ({ authorizeUrl }) => window.location.assign(authorizeUrl),
    onError: (e) => toast(errorMessage(e), 'error'),
  });
  return (
    <Button variant={variant} className={className} loading={start.isPending || start.isSuccess} onClick={() => start.mutate()}>
      {label ?? `Connect ${PLATFORM_LABEL[platform]}`}
    </Button>
  );
}

const FIELD_HELP: Record<Platform, { token: string; idLabel?: string; idKey?: keyof ConnectBody; idHint?: string }> = {
  instagram: { token: 'A Meta access token with instagram_basic and instagram_manage_insights.', idLabel: 'Instagram business account ID', idKey: 'accountId', idHint: 'Only needed if your token can see more than one account.' },
  facebook: { token: 'A Meta access token with pages_show_list, pages_read_engagement and read_insights.', idLabel: 'Facebook Page ID', idKey: 'pageId', idHint: 'Only needed if you manage more than one Page.' },
  youtube: { token: 'A YouTube Data API key (public numbers only) or an OAuth access token (adds watch time).' },
  linkedin: { token: 'A LinkedIn access token with Community Management permissions for your Page.', idLabel: 'LinkedIn organization ID', idKey: 'organizationId', idHint: 'The numeric ID of the Page you manage.' },
};

/**
 * Advanced connect with a token the user already has. The token is sent once to the API (validated and encrypted
 * there) and is never stored in the browser.
 */
export function TokenConnectForm({ connection, onDone }: { connection: Connection; onDone?: () => void }) {
  const platform = connection.platform;
  const help = FIELD_HELP[platform];
  const client = useQueryClient();
  const toast = useToast();
  const { track } = useSync();
  const [token, setToken] = useState('');
  const [ytKind, setYtKind] = useState<'apiKey' | 'accessToken'>('apiKey');
  const [extra, setExtra] = useState('');
  const [error, setError] = useState('');

  const connect = useMutation({
    mutationFn: (body: ConnectBody) => connectionsApi.connect(platform, body),
    onSuccess: (r) => {
      track([r.syncRun]);
      setToken('');
      setExtra('');
      void client.invalidateQueries({ queryKey: qk.connections });
      toast(`${PLATFORM_LABEL[platform]} connected. We're importing your posts now.`);
      onDone?.();
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError(platform === 'youtube' && ytKind === 'apiKey' ? 'Paste your API key' : 'Paste your access token');
      return;
    }
    setError('');
    const body: ConnectBody = {};
    if (platform === 'youtube') {
      body[ytKind] = token.trim();
      const ch = extra.trim();
      if (ch) {
        if (/^UC[\w-]{22}$/.test(ch)) body.channelId = ch;
        else body.channelQuery = ch;
      }
    } else {
      body.accessToken = token.trim();
      if (help.idKey && extra.trim()) body[help.idKey] = extra.trim();
    }
    connect.mutate(body);
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <p className="text-sm text-ink-muted">{help.token}</p>
      {connection.capabilities.notes.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
          {connection.capabilities.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      ) : null}
      {connect.isError ? <FormError error={connect.error} /> : null}
      {platform === 'youtube' ? (
        <SelectField label="What do you have?" value={ytKind} onChange={(e) => setYtKind(e.target.value as typeof ytKind)}>
          <option value="apiKey">An API key</option>
          <option value="accessToken">An OAuth access token</option>
        </SelectField>
      ) : null}
      <PasswordField
        label={platform === 'youtube' && ytKind === 'apiKey' ? 'API key' : 'Access token'}
        autoComplete="off"
        spellCheck={false}
        value={token}
        onChange={(e) => setToken(e.target.value)}
        error={error}
        hint="Sent once to Media Navigator, checked with the platform, then stored encrypted. Never saved in your browser."
      />
      {platform === 'youtube' ? (
        <TextField label="Channel ID or @handle" optional value={extra} onChange={(e) => setExtra(e.target.value)} hint="Needed with an API key, so we know which channel to read." autoComplete="off" />
      ) : help.idLabel ? (
        <TextField label={help.idLabel} optional value={extra} onChange={(e) => setExtra(e.target.value)} hint={help.idHint} autoComplete="off" />
      ) : null}
      <Button type="submit" loading={connect.isPending}>Connect with token</Button>
    </form>
  );
}
