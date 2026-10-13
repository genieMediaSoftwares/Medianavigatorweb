'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { BarChart3, CheckCircle2, ExternalLink, KeyRound } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Notice } from '@/components/ui/states';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import type { Connection } from '@/types/api';

const LINKS = {
  console: 'https://console.cloud.google.com/apis/credentials',
  library: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
  dataDocs: 'https://developers.google.com/youtube/v3',
  analyticsDocs: 'https://developers.google.com/youtube/analytics',
};

// Mirrors the server's checks so mistakes are caught before a request is made.
const schema = z.object({
  apiKey: z.string().trim().regex(/^AIza[0-9A-Za-z_-]{35}$/, 'Paste the API key from Google Cloud Console. It starts with “AIza” and is 39 characters.'),
  channel: z.string().trim().regex(/^(UC[A-Za-z0-9_-]{22}|@[A-Za-z0-9._-]{3,30})$|youtube\.com\/(channel\/UC[A-Za-z0-9_-]{22}|@[A-Za-z0-9._-]{3,30})/i, 'Enter your channel ID (starts with UC) or your exact @handle.'),
});
type Values = z.infer<typeof schema>;

function Section({ step, icon, title, children }: { step: string; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-line p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-600">{icon}</span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{step}</p>
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        </div>
      </div>
      {children}
    </section>
  );
}

const ext = (href: string, label: string, primary = false) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 text-sm font-semibold ${primary ? 'text-ink hover:underline' : 'text-brand-600 hover:underline'}`}>
    {label}<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
  </a>
);

/**
 * YouTube's two credential paths, kept apart because Google treats them differently:
 * A. YouTube Data API v3 with an API key and an exact channel (public data).
 * B. YouTube Analytics API through Google sign-in (OAuth), the only way Google allows private analytics.
 */
export function YouTubeConnect({ connection, onConnected, onError }: { connection?: Connection; onConnected: () => Promise<void> | void; onError: (m: string | null) => void }) {
  const oauth = Boolean(connection?.oauthAvailable);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), mode: 'onTouched' });

  const submit = handleSubmit(async (v) => {
    onError(null);
    try {
      await api.connect('youtube', { apiKey: v.apiKey.trim(), channelQuery: v.channel.trim() });
      reset();
      await onConnected();
    } catch (e) {
      onError(e instanceof ApiError && e.status === 409 ? 'That YouTube channel is already connected to another Media Navigator account.' : e instanceof ApiError ? e.message : 'We couldn’t connect YouTube. Please try again.');
    }
  });

  const signIn = async () => {
    setBusy(true); onError(null);
    try { const { authorizeUrl } = await api.startOAuth('youtube'); window.location.assign(authorizeUrl); }
    catch (e) { onError(e instanceof ApiError ? e.message : 'We couldn’t start the Google sign-in.'); setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <Section step="Section A" icon={<KeyRound className="h-4 w-4" aria-hidden="true" />} title="YouTube Data API v3">
        <p className="text-sm text-muted">Reads your channel and its public video data: videos, Shorts, views, likes and comments. An API key reads public data for the channel you name; it can’t prove the channel is yours or open private analytics.</p>
        <ol className="list-decimal space-y-1 pl-5 text-[13px] text-muted">
          <li>In Google Cloud Console, select a project. Under APIs &amp; Services → Library, enable <strong>YouTube Data API v3</strong> (and <strong>YouTube Analytics API</strong> for Section B).</li>
          <li>Credentials → Create credentials → <strong>API key</strong>. Under “API restrictions” allow YouTube Data API v3; leave “Application restrictions” as None or this server’s IP.</li>
          <li>Find your channel ID in YouTube Studio → Settings → Channel → Advanced settings, or use your @handle.</li>
        </ol>
        <div className="flex flex-wrap gap-x-4 gap-y-1">{ext(LINKS.console, 'Open Google Cloud Console', true)}{ext(LINKS.library, 'Enable YouTube Data API v3')}{ext(LINKS.dataDocs, 'Documentation')}</div>
        <form onSubmit={submit} noValidate className="space-y-3 pt-1">
          <Field label="YouTube Data API key" error={errors.apiKey?.message} hint="Stored encrypted on our server and never shown again.">{(p) => <Input type="password" autoComplete="off" spellCheck={false} placeholder="AIza…" {...p} {...register('apiKey')} />}</Field>
          <Field label="Channel ID or @handle" error={errors.channel?.message} hint="Must match exactly. Names and search terms aren’t accepted.">{(p) => <Input autoComplete="off" spellCheck={false} placeholder="@YourChannel or UC…" {...p} {...register('channel')} />}</Field>
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Connect with API key</Button>
        </form>
      </Section>

      <Section step="Section B" icon={<BarChart3 className="h-4 w-4" aria-hidden="true" />} title="YouTube Analytics API">
        <p className="text-sm text-muted">Adds watch time for each video from your channel’s private analytics. Google only allows this after you sign in with the Google account that owns or manages the channel; API keys can’t access it.</p>
        {connection?.connected && connection.authMethod === 'oauth' ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-good"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Connected with your Google account. Watch time is included.</p>
        ) : oauth ? (
          <>
            <Button size="lg" variant="secondary" className="w-full" loading={busy} onClick={() => void signIn()}>Connect Google Account</Button>
            <p className="text-xs text-muted">Read-only (youtube.readonly, yt-analytics.readonly). It also connects your channel, so Section A isn’t needed, and it renews automatically.</p>
          </>
        ) : (
          <Notice>Google sign-in isn’t set up on this server yet. Add YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and YOUTUBE_REDIRECT_URI to backend/.env (the steps are in that file) and restart the backend. Until then, use Section A; watch time shows as not available.</Notice>
        )}
        {ext(LINKS.analyticsDocs, 'Documentation')}
      </Section>
    </div>
  );
}
