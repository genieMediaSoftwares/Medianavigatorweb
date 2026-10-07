import React, { useEffect, useRef, useState } from 'react';
import { X, ExternalLink, Lock, ShieldCheck, CheckCircle2, ChevronDown, Loader2, TriangleAlert } from 'lucide-react';
import { api } from '../../services/api';
import { PlatformType, PlatformConnection } from '../../types';
import { useMedia } from '../../app/providers/MediaContext';
import { InstagramLogo, YouTubeLogo, FacebookLogo, LinkedInLogo } from '../common/PlatformLogos';
import { Badge, timeAgo } from '../ui';

interface PlatformConnectModalProps {
  platform: PlatformType | null;
  connection?: PlatformConnection;
  onClose: () => void;
  onSuccess: () => void;
}

const META: Record<PlatformType, {
  name: string; logo: React.ReactNode; tokenLabel: string; tokenPlaceholder: string; idLabel: string; idHint: string; guideUrl: string;
  permissions: { name: string; desc: string }[];
}> = {
  instagram: {
    name: 'Instagram', logo: <InstagramLogo size="lg" />, tokenLabel: 'Access token', tokenPlaceholder: 'EAAB… or IGAA…',
    idLabel: 'Instagram username or account ID (optional)', idHint: 'Only needed if your token can reach more than one account.',
    guideUrl: 'https://developers.facebook.com/tools/explorer/',
    permissions: [
      { name: 'Profile and posts', desc: 'Read your professional account and its media' },
      { name: 'Insights', desc: 'Read reach, views and engagement for each post' },
      { name: 'Linked Page', desc: 'Find the Facebook Page your account is attached to' },
    ],
  },
  facebook: {
    name: 'Facebook', logo: <FacebookLogo size="lg" />, tokenLabel: 'User access token', tokenPlaceholder: 'EAAB…',
    idLabel: 'Page ID (optional)', idHint: 'Leave empty to use the first Page you manage.',
    guideUrl: 'https://developers.facebook.com/tools/explorer/',
    permissions: [
      { name: 'Page posts', desc: 'Read reactions, comments and shares on your Page' },
      { name: 'Page list', desc: 'Find the Pages you manage' },
      { name: 'Insights', desc: 'Read Page-level impressions' },
    ],
  },
  youtube: {
    name: 'YouTube', logo: <YouTubeLogo size="lg" />, tokenLabel: 'API key', tokenPlaceholder: 'AIza…',
    idLabel: 'Channel handle or link (optional)', idHint: 'For example @YourChannel. Leave empty to detect it automatically.',
    guideUrl: 'https://console.cloud.google.com/apis/credentials',
    permissions: [
      { name: 'Channel and videos', desc: 'Read uploads and public statistics' },
      { name: 'Analytics (OAuth only)', desc: 'Watch time and retention, when you sign in with Google' },
    ],
  },
  linkedin: {
    name: 'LinkedIn', logo: <LinkedInLogo size="lg" />, tokenLabel: 'Access token', tokenPlaceholder: 'AQV…',
    idLabel: 'Organization ID (optional)', idHint: 'Leave empty to use the first company page you administer.',
    guideUrl: 'https://www.linkedin.com/developers/tools/oauth',
    permissions: [
      { name: 'Company page posts', desc: 'Read posts and share statistics' },
      { name: 'Admin check', desc: 'Confirm you administer the company page' },
    ],
  },
};

export const PlatformConnectModal: React.FC<PlatformConnectModalProps> = ({ platform, connection, onClose, onSuccess }) => {
  const { setSelectedPlatform } = useMedia();
  const [token, setToken] = useState('');
  const [accountId, setAccountId] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [busy, setBusy] = useState<null | 'oauth' | 'token' | 'disconnect'>(null);
  const [step, setStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  if (!platform) return null;
  const meta = META[platform];
  const live = Boolean(connection?.connected);
  const oauth = Boolean(connection?.oauthAvailable);
  const needsAttention = connection && ['connection_expired', 'permission_required', 'sync_failed'].includes(connection.status);

  const startOAuth = async () => {
    setError(null); setBusy('oauth');
    try { await api.startOAuth(platform); } catch (e: any) { setBusy(null); setError(e.message || 'Could not start the sign-in.'); }
  };

  const submitToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setBusy('token');
    const value = token.trim();
    const id = accountId.trim();
    const payload: Record<string, string> = platform === 'youtube' ? { apiKey: value } : { accessToken: value };
    if (id) {
      if (platform === 'instagram') { payload.accountId = id; payload.username = id; }
      if (platform === 'facebook') payload.pageId = id;
      if (platform === 'youtube') { payload.channelId = id; payload.channelQuery = id; }
      if (platform === 'linkedin') payload.organizationId = id;
    }
    try {
      setStep('Checking your credentials…');
      const timer = setTimeout(() => setStep('Importing your posts. This can take a minute for large accounts…'), 2500);
      await api.connectPlatform(platform, payload);
      clearTimeout(timer);
      setToken('');
      setStep('Connected');
      setSelectedPlatform(platform);
      setTimeout(() => { setBusy(null); onSuccess(); onClose(); }, 600);
    } catch (err: any) {
      setBusy(null); setStep('');
      setError(err.message || `Could not connect ${meta.name}. Please check your details.`);
    }
  };

  const disconnect = async () => {
    setError(null); setBusy('disconnect');
    try { await api.disconnectPlatform(platform); onSuccess(); onClose(); }
    catch (err: any) { setBusy(null); setError(err.message || `Could not disconnect ${meta.name}.`); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/45 backdrop-blur-[2px]" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="connect-title" id="platform-connect-modal"
        className="w-full sm:max-w-[520px] bg-white rounded-t-3xl sm:rounded-3xl shadow-pop overflow-hidden flex flex-col max-h-[94vh] outline-none animate-fade-up">
        <div className="px-6 pt-6 pb-4 flex items-start gap-4">
          <span className="w-14 h-14 rounded-2xl bg-canvas-soft flex items-center justify-center shrink-0">{meta.logo}</span>
          <div className="flex-1 min-w-0">
            <h2 id="connect-title" className="text-xl font-bold tracking-tight">{live ? `${meta.name} connection` : `Connect ${meta.name}`}</h2>
            <p className="text-sm text-muted mt-0.5">{live ? connection!.accountHandle : 'Read-only access to analyze your posts.'}</p>
          </div>
          <button onClick={onClose} disabled={!!busy} className="p-2 -mr-2 -mt-1 rounded-xl text-muted hover:text-ink hover:bg-canvas-soft" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 pb-6 overflow-y-auto space-y-5">
          {live && (
            <div className="rounded-2xl border border-line bg-canvas p-4 space-y-3">
              <div className="flex items-center gap-2">
                {needsAttention ? <Badge tone="warning" dot>Needs attention</Badge> : <Badge tone="success" dot>Connected</Badge>}
                <span className="text-sm text-muted">Last synced {timeAgo(connection!.lastSyncedAt)} · {connection!.dataPointsCount} posts</span>
              </div>
              {connection!.statusMessage && needsAttention && <p className="text-sm text-body flex gap-2"><TriangleAlert className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />{connection!.statusMessage}</p>}
              {!confirmDisconnect ? (
                <button onClick={() => setConfirmDisconnect(true)} className="text-sm font-semibold text-rose-700 hover:underline">Disconnect {meta.name}</button>
              ) : (
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 space-y-2">
                  <p className="text-sm text-rose-900">Disconnecting stops syncing and deletes the stored access token. Your past posts and results are kept.</p>
                  <div className="flex gap-2">
                    <button onClick={disconnect} disabled={!!busy} className="btn btn-sm bg-rose-600 text-white hover:bg-rose-700">{busy === 'disconnect' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Yes, disconnect</button>
                    <button onClick={() => setConfirmDisconnect(false)} className="btn btn-sm btn-secondary">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {oauth && (
            <button onClick={startOAuth} disabled={!!busy} className="btn btn-primary btn-lg w-full">
              {busy === 'oauth' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ExternalLink className="w-5 h-5" />}
              {live ? `Reconnect with ${meta.name}` : `Continue with ${meta.name}`}
            </button>
          )}

          <div>
            {oauth ? (
              <button type="button" onClick={() => setShowToken((v) => !v)} aria-expanded={showToken} className="flex items-center gap-1.5 text-sm font-semibold text-body hover:text-ink">
                <ChevronDown className={`w-4 h-4 transition-transform ${showToken ? 'rotate-180' : ''}`} />Use an access token instead
              </button>
            ) : (
              <p className="text-sm text-body mb-3">Paste an access token from {meta.name}. {live ? 'This replaces the one we have stored.' : ''}</p>
            )}

            {(showToken || !oauth) && (
              <form onSubmit={submitToken} className="mt-3 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="cred" className="text-sm font-semibold">{meta.tokenLabel}</label>
                    <a href={meta.guideUrl} target="_blank" rel="noreferrer" className="text-sm text-brand-700 hover:underline inline-flex items-center gap-1">Where do I get one?<ExternalLink className="w-3.5 h-3.5" /></a>
                  </div>
                  <input id="cred" className="input" type="password" autoComplete="off" spellCheck={false} required value={token} onChange={(e) => setToken(e.target.value)} placeholder={meta.tokenPlaceholder} />
                </div>
                <div>
                  <label htmlFor="acct" className="text-sm font-semibold block mb-1.5">{meta.idLabel}</label>
                  <input id="acct" className="input" type="text" autoComplete="off" value={accountId} onChange={(e) => setAccountId(e.target.value)} />
                  <p className="text-xs text-muted mt-1.5">{meta.idHint}</p>
                </div>
                <button type="submit" disabled={!!busy || !token.trim()} className={`btn ${oauth ? 'btn-secondary' : 'btn-primary btn-lg'} w-full`}>
                  {busy === 'token' ? <><Loader2 className="w-4 h-4 animate-spin" />{step || 'Connecting…'}</> : live ? 'Update connection' : `Connect ${meta.name}`}
                </button>
              </form>
            )}
          </div>

          {busy === 'token' && step === 'Connected' && <p className="text-sm font-semibold text-emerald-700 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Connected. Loading your insights…</p>}
          {error && <div role="alert" className="rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-900 p-3">{error}</div>}

          <div className="rounded-2xl bg-canvas p-4">
            <div className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="w-4 h-4 text-brand-600" />What we can access</div>
            <ul className="mt-2 space-y-1.5">
              {meta.permissions.map((p) => (
                <li key={p.name} className="text-sm text-body"><span className="font-semibold text-ink">{p.name}.</span> {p.desc}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted flex gap-2"><Lock className="w-4 h-4 shrink-0 mt-0.5" />Access is read-only: Media Navigator can’t post, edit or delete anything. Tokens are encrypted on our server, never shown again, and deleted when you disconnect.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
