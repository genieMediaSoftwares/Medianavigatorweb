import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { startTestDb, stopTestDb, clearDb, api, registerUser } from './helpers.js';
import { fake, makeMedia } from './fakes.js';

vi.mock('../src/integrations/registry.js', async () => {
  const { fakeAdapter } = await import('./fakes.js');
  const adapters: Record<string, any> = {};
  return { PLATFORMS: ['instagram', 'facebook', 'youtube', 'linkedin'], getAdapter: (p: string) => (adapters[p] ??= fakeAdapter(p as any)) };
});

import { OAuthState } from '../src/models/OAuthState.js';
import { ConnectedAccount } from '../src/models/ConnectedAccount.js';
import { decryptSecret } from '../src/lib/crypto.js';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => { await clearDb(); fake.reset(); fake.items = makeMedia(3, 'youtube'); vi.unstubAllGlobals(); });

const stubTokenEndpoint = () => {
  const calls: Array<{ url: string; body?: string }> = [];
  vi.stubGlobal('fetch', vi.fn(async (url: any, init?: RequestInit) => {
    calls.push({ url: String(url), body: init?.body ? String(init.body) : undefined });
    return new Response(JSON.stringify({ access_token: 'access-from-provider', refresh_token: 'refresh-from-provider', expires_in: 3600 }), { status: 200 });
  }));
  return calls;
};

describe('OAuth connection flow', () => {
  it('starts with a short-lived single-use state, PKCE for Google, and the configured redirect', async () => {
    const u = await registerUser('o1@test.example');
    const res = await api().post('/api/v1/connections/youtube/oauth/start').set(u.auth);
    expect(res.status).toBe(200);
    const url = new URL(res.body.data.authorizeUrl);
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('yt-id');
    expect(url.searchParams.get('redirect_uri')).toBe('https://api.test.example/api/v1/connections/oauth/youtube/callback');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(url.searchParams.get('state')!.length).toBeGreaterThanOrEqual(32);
    expect(JSON.stringify(res.body)).not.toContain('yt-secret');
    const stored = await OAuthState.findOne().lean();
    expect(stored!.stateHash).not.toBe(url.searchParams.get('state')); // only a hash is stored
    expect(decryptSecret(stored!.codeVerifierEnc!)).toBeTruthy();
    expect(stored!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('completes Instagram login, upgrades the token, queues import and prevents replay', async () => {
    const u = await registerUser('instagram-login@test.example');
    const start = await api().post('/api/v1/connections/instagram/oauth/start').set(u.auth);
    const state = new URL(start.body.data.authorizeUrl).searchParams.get('state')!;
    const calls: Array<{ url: string; body: string }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input: any, init?: RequestInit) => {
      calls.push({ url: String(input), body: String(init?.body || '') });
      return new Response(JSON.stringify(calls.length === 1 ? { access_token: 'short-private', user_id: '123' } : { access_token: 'long-private', expires_in: 5184000 }));
    }));
    const result = await api().get('/api/v1/connections/oauth/instagram/callback').query({ code: 'ig-code', state });
    expect(result.headers.location).toBe('https://app.test.example/connections?oauth=connected&platform=instagram');
    expect(calls[0].url).toBe('https://api.instagram.com/oauth/access_token');
    expect(new URLSearchParams(calls[0].body).get('client_secret')).toBe('ig-secret');
    expect(new URL(calls[1].url).searchParams.get('grant_type')).toBe('ig_exchange_token');
    const account = await ConnectedAccount.findOne({ platform: 'instagram' }).select('+credentialsEnc').lean();
    expect(account!.authMethod).toBe('oauth');
    expect(account!.status).toBe('syncing');
    expect(JSON.parse(decryptSecret(account!.credentialsEnc!))).toMatchObject({ instagramLogin: true, accessToken: 'long-private' });
    expect(result.headers.location).not.toContain('private');
    const replay = await api().get('/api/v1/connections/oauth/instagram/callback').query({ code: 'ig-code', state });
    expect(replay.headers.location).toContain('oauth=failed');
    expect(calls).toHaveLength(2);
  });

  it('sends Facebook users to official consent and returns them to the app after encrypted connection', async () => {
    const u = await registerUser('facebook-oauth@test.example');
    const start = await api().post('/api/v1/connections/facebook/oauth/start').set(u.auth);
    const url = new URL(start.body.data.authorizeUrl);
    expect(url.hostname).toBe('www.facebook.com');
    expect(url.searchParams.get('scope')).toBe('pages_show_list,pages_read_engagement,pages_read_user_content,read_insights');
    expect(url.searchParams.get('redirect_uri')).toBe('https://api.test.example/api/v1/connections/oauth/facebook/callback');
    const calls = stubTokenEndpoint();
    const result = await api().get('/api/v1/connections/oauth/facebook/callback').query({ code: 'fb-code', state: url.searchParams.get('state') });
    expect(result.headers.location).toBe('https://app.test.example/connections?oauth=connected&platform=facebook');
    expect(calls).toHaveLength(2);
    const account = await ConnectedAccount.findOne({ platform: 'facebook' }).select('+credentialsEnc').lean();
    expect(account!.status).toBe('syncing');
    expect(account!.credentialsEnc).not.toContain('access-from-provider');
  });

  it('reports unconfigured providers instead of failing obscurely', async () => {
    const u = await registerUser('o2@test.example');
    const list = (await api().get('/api/v1/connections').set(u.auth)).body.data;
    expect(list.every((c: any) => c.oauthAvailable === true)).toBe(true);
  });

  it('completes the callback once: exchanges the code, encrypts tokens, queues a sync, redirects without secrets', async () => {
    const u = await registerUser('o3@test.example');
    const state = new URL((await api().post('/api/v1/connections/youtube/oauth/start').set(u.auth)).body.data.authorizeUrl).searchParams.get('state')!;
    const calls = stubTokenEndpoint();
    const res = await api().get('/api/v1/connections/oauth/youtube/callback').query({ code: 'auth-code-xyz', state });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://app.test.example/connections?oauth=connected&platform=youtube');
    expect(res.headers.location).not.toMatch(/token|code=/);
    expect(calls[0].url).toBe('https://oauth2.googleapis.com/token');
    expect(calls[0].body).toContain('code_verifier=');
    expect(calls[0].body).toContain('code=auth-code-xyz');

    const acc = await ConnectedAccount.findOne({ platform: 'youtube' }).select('+credentialsEnc').lean();
    expect(acc!.userId.toString()).toBe(u.id);
    expect(acc!.credentialsEnc).not.toContain('access-from-provider');
    expect(JSON.parse(decryptSecret(acc!.credentialsEnc!))).toMatchObject({ accessToken: 'access-from-provider', refreshToken: 'refresh-from-provider' });
    expect((await api().get('/api/v1/connections').set(u.auth)).body.data.find((c: any) => c.platform === 'youtube').status).toBe('syncing');

    // replaying the same callback is rejected: the state is single use
    stubTokenEndpoint();
    const replay = await api().get('/api/v1/connections/oauth/youtube/callback').query({ code: 'auth-code-xyz', state });
    expect(replay.headers.location).toContain('oauth=failed');
  });

  it('rejects unknown, expired, wrong-platform and denied callbacks without calling the provider', async () => {
    const u = await registerUser('o4@test.example');
    const calls = stubTokenEndpoint();
    const bogus = await api().get('/api/v1/connections/oauth/youtube/callback').query({ code: 'c', state: 'x'.repeat(40) });
    expect(bogus.headers.location).toContain('oauth=failed');

    const s1 = new URL((await api().post('/api/v1/connections/youtube/oauth/start').set(u.auth)).body.data.authorizeUrl).searchParams.get('state')!;
    await OAuthState.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await api().get('/api/v1/connections/oauth/youtube/callback').query({ code: 'c', state: s1 })).headers.location).toContain('oauth=failed');

    const s2 = new URL((await api().post('/api/v1/connections/youtube/oauth/start').set(u.auth)).body.data.authorizeUrl).searchParams.get('state')!;
    expect((await api().get('/api/v1/connections/oauth/linkedin/callback').query({ code: 'c', state: s2 })).headers.location).toContain('oauth=failed');

    const s3 = new URL((await api().post('/api/v1/connections/youtube/oauth/start').set(u.auth)).body.data.authorizeUrl).searchParams.get('state')!;
    expect((await api().get('/api/v1/connections/oauth/youtube/callback').query({ error: 'access_denied', state: s3 })).headers.location).toContain('oauth=denied');
    expect(calls).toHaveLength(0);
    expect(await ConnectedAccount.countDocuments()).toBe(0);
  });

  it('a state minted for one user can never connect an account to another', async () => {
    const a = await registerUser('o5a@test.example');
    const b = await registerUser('o5b@test.example');
    const state = new URL((await api().post('/api/v1/connections/youtube/oauth/start').set(a.auth)).body.data.authorizeUrl).searchParams.get('state')!;
    stubTokenEndpoint();
    await api().get('/api/v1/connections/oauth/youtube/callback').query({ code: 'c', state }); // even if b's browser delivers it
    expect(await ConnectedAccount.countDocuments({ userId: a.id as any })).toBe(1);
    expect(await ConnectedAccount.countDocuments({ userId: b.id as any })).toBe(0);
  });

  it('surfaces provider rejection as a failed redirect and stores nothing', async () => {
    const u = await registerUser('o6@test.example');
    const state = new URL((await api().post('/api/v1/connections/instagram/oauth/start').set(u.auth)).body.data.authorizeUrl).searchParams.get('state')!;
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'Invalid verification code format.' } }), { status: 400 })));
    const res = await api().get('/api/v1/connections/oauth/instagram/callback').query({ code: 'bad', state });
    expect(res.headers.location).toContain('oauth=failed');
    expect(await ConnectedAccount.countDocuments()).toBe(0);
  });
});
