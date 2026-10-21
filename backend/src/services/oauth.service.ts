import type { PlatformType } from '../../../shared/types.js';
import { config } from '../config/env.js';
import { badRequest, providerError, unavailable } from '../lib/errors.js';
import { encryptSecret, decryptSecret, pkcePair, randomToken, sha256 } from '../lib/crypto.js';
import { httpFetch } from '../lib/http.js';
import { oauthStateRepository } from '../repositories/oauthState.repository.js';
import { toObjectId } from '../lib/ids.js';
import type { ProviderCredentials } from '../integrations/types.js';
import { getAdapter } from '../integrations/registry.js';

interface OAuthApp { authorizeUrl: string; clientId: string; redirectUri: string; scope: string; pkce: boolean; extra?: Record<string, string> }

const FACEBOOK_SCOPES = 'pages_show_list,pages_read_engagement,pages_read_user_content,read_insights';

/**
 * Normalize legacy Meta callback configuration for Facebook. Instagram Login uses its
 * separate Instagram app and redirect URI; each OAuth state remains platform-bound.
 */
export function metaRedirectUri(configured: string, platform: 'instagram' | 'facebook'): string {
  return configured.replace(/\/oauth\/(instagram|facebook)\/callback(?=$|[?#])/, `/oauth/${platform}/callback`);
}

export function oauthApp(platform: PlatformType): OAuthApp {
  const p = config.providers;
  if (platform === 'instagram') {
    if (!p.instagram) throw unavailable('Instagram sign-in is not configured yet. Please contact the app administrator.');
    return { authorizeUrl: 'https://www.instagram.com/oauth/authorize', clientId: p.instagram.appId, redirectUri: p.instagram.redirectUri, scope: 'instagram_business_basic,instagram_business_manage_insights', pkce: false, extra: { enable_fb_login: '0', force_authentication: '1' } };
  }
  if (platform === 'facebook') {
    if (!p.meta) throw unavailable('Meta OAuth is not configured on this server');
    return { authorizeUrl: `https://www.facebook.com/${p.metaApiVersion}/dialog/oauth`, clientId: p.meta.appId, redirectUri: metaRedirectUri(p.meta.redirectUri, platform), scope: FACEBOOK_SCOPES, pkce: false };
  }
  if (platform === 'youtube') {
    if (!p.youtube) throw unavailable('YouTube OAuth is not configured on this server');
    return {
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth', clientId: p.youtube.clientId, redirectUri: p.youtube.redirectUri,
      scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly', pkce: true,
      extra: { access_type: 'offline', prompt: 'consent', response_type: 'code' },
    };
  }
  if (!p.linkedin) throw unavailable('LinkedIn OAuth is not configured on this server');
  return { authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization', clientId: p.linkedin.clientId, redirectUri: p.linkedin.redirectUri, scope: 'openid profile r_organization_social rw_organization_admin', pkce: false };
}

export const oauthEnabled = (platform: PlatformType) => {
  try { oauthApp(platform); return true; } catch { return false; }
};

export const oauthService = {
  /** Creates a short-lived, single-use, user-bound state (and a PKCE verifier where supported) and returns the consent URL. */
  async start(userId: string, platform: PlatformType): Promise<{ authorizeUrl: string; expiresInSeconds: number }> {
    const app = oauthApp(platform);
    const state = randomToken(32);
    const pkce = app.pkce ? pkcePair() : null;
    await oauthStateRepository.create({
      stateHash: sha256(state), userId: toObjectId(userId), platform,
      codeVerifierEnc: pkce ? encryptSecret(pkce.verifier) : undefined,
      expiresAt: new Date(Date.now() + config.providers.oauthStateTtlSeconds * 1000),
    });
    const url = new URL(app.authorizeUrl);
    url.searchParams.set('client_id', app.clientId);
    url.searchParams.set('redirect_uri', app.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', app.scope);
    url.searchParams.set('state', state);
    if (pkce) { url.searchParams.set('code_challenge', pkce.challenge); url.searchParams.set('code_challenge_method', 'S256'); }
    for (const [k, v] of Object.entries(app.extra ?? {})) url.searchParams.set(k, v);
    return { authorizeUrl: url.toString(), expiresInSeconds: config.providers.oauthStateTtlSeconds };
  },

  /**
   * Validates the callback state (exists, unexpired, unused, for this platform), consumes it, and exchanges the code.
   * The authorization code is used once and never stored.
   */
  async complete(platform: PlatformType, code: string, state: string): Promise<{ userId: string; credentials: ProviderCredentials }> {
    const record = await oauthStateRepository.consume(sha256(state));
    if (!record || record.platform !== platform) throw badRequest('Invalid or expired authorization state');
    const verifier = record.codeVerifierEnc ? decryptSecret(record.codeVerifierEnc) : undefined;
    const credentials = await exchangeCode(platform, code, verifier);
    return { userId: String(record.userId), credentials };
  },
};

async function exchangeCode(platform: PlatformType, code: string, verifier?: string): Promise<ProviderCredentials> {
  const app = oauthApp(platform);
  const p = config.providers;

  if (platform === 'instagram') {
    const body = new URLSearchParams({ client_id: app.clientId, client_secret: p.instagram!.appSecret, grant_type: 'authorization_code', redirect_uri: app.redirectUri, code });
    const response = await httpFetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const payload = await response.json().catch(() => ({}));
    const short = Array.isArray(payload.data) && payload.data.length === 1 ? payload.data[0] : payload;
    if (!response.ok || typeof short.access_token !== 'string' || !short.user_id) throw providerError('Instagram could not complete sign-in. Please reconnect and approve media and insights access.');
    const url = new URL('https://graph.instagram.com/access_token');
    url.searchParams.set('grant_type', 'ig_exchange_token');
    url.searchParams.set('client_secret', p.instagram!.appSecret);
    url.searchParams.set('access_token', short.access_token);
    const long = await jsonOrThrow(await httpFetch(url, { maxRetries: 0 }), 'Instagram');
    if (!Number.isFinite(long.expires_in) || long.expires_in <= 86400) throw providerError('Instagram did not return a long-lived token. Please reconnect.');
    return { accessToken: long.access_token, accountId: String(short.user_id), instagramLogin: true, expiresAt: new Date(Date.now() + long.expires_in * 1000).toISOString() };
  }
  if (platform === 'facebook') {
    const url = new URL(`https://graph.facebook.com/${p.metaApiVersion}/oauth/access_token`);
    url.searchParams.set('client_id', app.clientId);
    url.searchParams.set('client_secret', p.meta!.appSecret);
    url.searchParams.set('redirect_uri', app.redirectUri);
    url.searchParams.set('code', code);
    const short: any = await jsonOrThrow(await httpFetch(url, { method: 'GET' }), 'Meta');
    // Upgrade to a long-lived token (~60 days) so scheduled syncs keep working.
    const longUrl = new URL(`https://graph.facebook.com/${p.metaApiVersion}/oauth/access_token`);
    longUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longUrl.searchParams.set('client_id', app.clientId);
    longUrl.searchParams.set('client_secret', p.meta!.appSecret);
    longUrl.searchParams.set('fb_exchange_token', short.access_token);
    const long: any = await jsonOrThrow(await httpFetch(longUrl, { method: 'GET' }), 'Meta');
    return { accessToken: long.access_token, expiresAt: long.expires_in ? new Date(Date.now() + long.expires_in * 1000).toISOString() : undefined };
  }

  const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: app.redirectUri, client_id: app.clientId });
  if (platform === 'youtube') { body.set('client_secret', p.youtube!.clientSecret); if (verifier) body.set('code_verifier', verifier); }
  else body.set('client_secret', p.linkedin!.clientSecret);
  const tokenUrl = platform === 'youtube' ? 'https://oauth2.googleapis.com/token' : 'https://www.linkedin.com/oauth/v2/accessToken';
  const json: any = await jsonOrThrow(await httpFetch(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }), platform === 'youtube' ? 'Google' : 'LinkedIn');
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000).toISOString() : undefined,
  };
}

async function jsonOrThrow(res: Response, who: string) {
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json.error || !json.access_token) {
    // Provider error bodies can echo parameters; only the error code/description is surfaced.
    throw providerError(`${who} could not complete authorization. Please try signing in again and approve the requested access.`);
  }
  return json;
}

export { getAdapter };
