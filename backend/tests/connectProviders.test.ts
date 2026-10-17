import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { startTestDb, stopTestDb, clearDb, api, registerUser } from './helpers.js';

// Real Facebook, Instagram and LinkedIn adapters; only the providers' HTTP answers are simulated. No real provider is
// called and nothing here is presented as real account data.
type Answer = { status?: number; body: unknown };
let answer: (u: URL) => Answer = () => ({ status: 404, body: {} });
vi.mock('../src/lib/http.js', async (orig) => {
  const real = await orig<typeof import('../src/lib/http.js')>();
  return { ...real, httpFetch: vi.fn(async (input: string | URL) => { const a = answer(new URL(String(input))); return new Response(JSON.stringify(a.body), { status: a.status ?? 200 }); }) };
});

import { classifyFailure } from '../src/services/sync.service.js';
import { describeMetaError } from '../src/integrations/meta/metaErrors.js';
import { FacebookClient } from '../src/integrations/meta/facebook/facebookClient.js';

/** Graph path without the version prefix, e.g. "me/accounts". */
const graphPath = (u: URL) => u.pathname.replace(/^\/v\d+\.\d+\//, '').replace(/^\//, '');
const metaError = (code: number, message: string, subcode?: number): Answer => ({ status: code === 190 ? 401 : 400, body: { error: { message, type: 'OAuthException', code, ...(subcode ? { error_subcode: subcode } : {}) } } });
const granted = (...names: string[]) => ({ data: names.map((permission) => ({ permission, status: 'granted' })) });
const ME_USER = { body: { id: '901', name: 'Page Admin', permissions: granted('pages_show_list', 'pages_read_engagement', 'instagram_basic', 'instagram_manage_insights') } };
const PAGE = (id: string, name: string) => ({ id, name, fan_count: 10, category: 'Brand', access_token: `page-token-${id}` });

let user: Awaited<ReturnType<typeof registerUser>>;
const connect = (platform: string, body: Record<string, unknown>) => api().post(`/api/v1/connections/${platform}/connect`).set(user.auth).send(body);

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => { await clearDb(); user = await registerUser('connect@test.example'); });

describe('Facebook Page connection', () => {
  const userToken = (pages: unknown[]) => (u: URL): Answer => {
    const path = graphPath(u);
    if (path === 'me/permissions') return { body: (ME_USER.body as { permissions: unknown }).permissions };
    if (path === 'me' && u.searchParams.get('fields') === 'id,name') return ME_USER;
    if (path === 'me/permissions') return { body: ME_USER.body.permissions };
    if (path === 'me/accounts') return { body: { data: pages } };
    // A user token has no Page fields on /me.
    if (path === 'me') return metaError(100, '(#100) Tried accessing nonexisting field (fan_count) on node type (User)');
    return metaError(100, 'Unsupported get request.');
  };

  it('connects the only Page the token manages and stores its Page token, never returning it', async () => {
    answer = userToken([PAGE('111', 'Beach Cafe')]);
    const res = await connect('facebook', { accessToken: 'user-token' });
    expect(res.status).toBe(202);
    expect(res.body.data.connection).toMatchObject({ connected: true, accountHandle: 'Beach Cafe' });
    expect(JSON.stringify(res.body)).not.toMatch(/page-token|user-token/);
  });

  it('asks which Page when the token manages several (422 on the pageId field), instead of picking the first', async () => {
    answer = userToken([PAGE('111', 'Beach Cafe'), PAGE('222', 'Surf School')]);
    const res = await connect('facebook', { accessToken: 'user-token' });
    expect(res.status).toBe(422);
    expect(res.body.error.details[0]).toMatchObject({ path: 'pageId', reason: 'account_selection_required' });
    expect(res.body.error.message).toMatch(/Beach Cafe \(111\).*Surf School \(222\)/);
    const chosen = await connect('facebook', { accessToken: 'user-token', pageId: '222' });
    expect(chosen.status).toBe(202);
    expect(chosen.body.data.connection.accountHandle).toBe('Surf School');
  });

  it('refuses a Page ID the token does not manage (403) instead of silently connecting another Page', async () => {
    answer = userToken([PAGE('111', 'Beach Cafe')]);
    const res = await connect('facebook', { accessToken: 'user-token', pageId: '999' });
    expect(res.status).toBe(403);
    expect(res.body.error.details).toEqual({ reason: 'account_not_authorized', stage: 'account' });
    expect(res.body.error.message).toMatch(/isn’t one of the Pages this token manages/);
  });

  it('accepts a Page access token (no /accounts edge) and checks a typed Page ID against it', async () => {
    answer = (u) => {
      const path = graphPath(u);
      if (path === 'me/permissions') return metaError(100, '(#100) Tried accessing nonexisting field (permissions) on node type (Page)');
      if (path === 'me/accounts') return metaError(100, '(#100) Tried accessing nonexisting field (accounts) on node type (Page)');
      if (path === 'me') return { body: { id: '333', name: 'Harbour Bistro', username: 'harbourbistro', fan_count: 5 } };
      return metaError(100, 'Unsupported get request.');
    };
    expect((await connect('facebook', { accessToken: 'page-token' })).body.data.connection.accountHandle).toBe('Harbour Bistro');
    await clearDb(); user = await registerUser('connect2@test.example');
    const wrong = await connect('facebook', { accessToken: 'page-token', pageId: '444' });
    expect(wrong.status).toBe(403);
    expect(wrong.body.error.message).toMatch(/Page access token for “Harbour Bistro”/);
  });

  it('a token without any Page explains that personal profiles cannot be connected (404)', async () => {
    answer = userToken([]);
    const res = await connect('facebook', { accessToken: 'user-token' });
    expect(res.status).toBe(404);
    expect(res.body.error.details).toEqual({ reason: 'account_not_found', stage: 'account' });
    expect(res.body.error.message).toMatch(/Personal profiles can’t be connected/);
  });

  it('an expired token is a 400 with reason token_expired and a next step; Meta’s raw text is not shown', async () => {
    answer = () => metaError(190, 'Error validating access token: Session has expired on Monday.', 463);
    const res = await connect('facebook', { accessToken: 'old-token' });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual({ reason: 'token_expired', stage: 'token' });
    expect(res.body.error.message).toBe('This Facebook access token has expired. Generate a new one and connect again.');
  });

  it('“API access blocked” is reported as a Meta app restriction (403), not an invalid token', async () => {
    answer = () => metaError(200, 'API access blocked.');
    const res = await connect('facebook', { accessToken: 'blocked-token' });
    expect(res.status).toBe(403);
    expect(res.body.error.details).toEqual({ reason: 'app_restricted', stage: 'token' });
    expect(res.body.error.message).toMatch(/Media Navigator cannot remove a Meta restriction/);
    expect(res.body.error.message).not.toMatch(/Graph API Explorer/);
  });

  it('a user token generated without pages_read_engagement is refused up front, naming that permission', async () => {
    answer = (u) => {
      const path = graphPath(u);
      if (path === 'me/permissions') return { body: granted('pages_show_list', 'public_profile') };
      if (path === 'me') return { body: { id: '901', name: 'Page Admin' } };
      return metaError(100, 'Unsupported get request.');
    };
    const res = await connect('facebook', { accessToken: 'EAAuser-token' });
    expect(res.status).toBe(403);
    expect(res.body.error.details).toEqual({ reason: 'permission_missing', stage: 'permissions' });
    expect(res.body.error.message).toMatch(/generated without pages_read_engagement\./);
  });

  it('a permission refusal on the Page lookup names the permission Meta asked for', async () => {
    answer = (u) => {
      const path = graphPath(u);
      if (path === 'me/permissions') return metaError(100, 'Unsupported get request.');
      if (path === 'me' && u.searchParams.get('fields') === 'id,name') return ME_USER;
      return metaError(10, "(#10) This endpoint requires the 'pages_read_engagement' permission or the 'Page Public Content Access' feature.");
    };
    const res = await connect('facebook', { accessToken: 'EAAuser-token' });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/missing the pages_read_engagement permission\. In Graph API Explorer, add pages_read_engagement/);
  });

  it('Meta being unreachable is reported as provider_unavailable, not as a refused token', async () => {
    answer = () => { throw new TypeError('fetch failed'); };
    const res = await connect('instagram', { accessToken: 'EAAsome-token' });
    expect(res.body.error.details).toEqual({ reason: 'provider_unavailable', stage: 'token' });
    expect(res.body.error.message).toMatch(/couldn’t reach Meta/);
    expect(res.body.error.message).not.toMatch(/refused/);
  });

  it('an unrecognised Meta refusal shows what Meta said (code and message), never the token', async () => {
    answer = () => metaError(803, 'Some of the aliases you requested do not exist: EAAsecret-token-value-1234567890abc');
    const res = await connect('facebook', { accessToken: 'EAAsecret-token-value-1234567890abc' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Meta said: “Some of the aliases you requested do not exist: \[token\]” \(code 803\)/);
    expect(JSON.stringify(res.body)).not.toMatch(/EAAsecret/);
  });

  it('a request without a token is still a 422 that names the problem', async () => {
    const res = await connect('facebook', { pageId: '111' });
    expect(res.status).toBe(422);
    expect(res.body.error.details[0].message).toMatch(/accessToken or apiKey is required/);
  });
});

describe('Instagram account connection', () => {
  const igLoginToken = (me: Record<string, unknown>) => (u: URL): Answer => {
    if (u.hostname === 'graph.instagram.com') return { body: me };
    // Instagram Login tokens can't be parsed by graph.facebook.com.
    return metaError(190, 'Invalid OAuth access token - Cannot parse access token');
  };

  it('connects the account an Instagram Login token belongs to, with its real username', async () => {
    answer = igLoginToken({ id: 'app-scoped-1', user_id: '17841400000000001', username: 'svnbayparck', media_count: 421 });
    const res = await connect('instagram', { accessToken: 'IGAAtoken' });
    expect(res.status).toBe(202);
    expect(res.body.data.connection.accountHandle).toBe('@svnbayparck');
  });

  it('refuses a typed handle that is not the token’s account instead of relabelling it', async () => {
    answer = igLoginToken({ id: 'app-scoped-1', user_id: '17841400000000001', username: 'svnbayparck' });
    const res = await connect('instagram', { accessToken: 'IGAAtoken', accountId: '@someone_else' });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/This token is for @svnbayparck, not for “someone_else”/);
  });

  it('never connects another business’s public profile through Business Discovery', async () => {
    const requested: string[] = [];
    answer = (u) => {
      requested.push(u.toString());
      if (u.hostname === 'graph.instagram.com') return metaError(190, 'Invalid OAuth access token - Cannot parse access token');
      const path = graphPath(u);
      if (path === 'me' && u.searchParams.get('fields') === 'id,name') return ME_USER;
      if (path === 'me/permissions') return { body: ME_USER.body.permissions };
    if (path === 'me/accounts') return { body: { data: [{ ...PAGE('111', 'Beach Cafe'), instagram_business_account: { id: '178410001', username: 'beachcafe' } }] } };
      if (path === 'me') return { body: { id: '901', name: 'Page Admin' } };
      return metaError(100, 'Unsupported get request.');
    };
    const res = await connect('instagram', { accessToken: 'user-token', accountId: '@nike' });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/isn’t one of the Instagram accounts this token is authorized for \(@beachcafe/);
    expect(requested.some((r) => r.includes('business_discovery'))).toBe(false);
  });

  it('sync re-resolves the stored account ID for both token types (the path every Instagram sync takes)', async () => {
    const { InstagramClient } = await import('../src/integrations/meta/instagram/instagramClient.js');
    const client = new InstagramClient();
    answer = igLoginToken({ id: 'app-scoped-1', user_id: '17841400000000001', username: 'svnbayparck' });
    expect((await client.resolveAccount('IGAAtoken', '17841400000000001')).username).toBe('svnbayparck');
    answer = (u) => {
      if (u.hostname === 'graph.instagram.com') return metaError(190, 'Invalid OAuth access token - Cannot parse access token');
      const path = graphPath(u);
      if (path === 'me/permissions') return { body: ME_USER.body.permissions };
    if (path === 'me/accounts') return { body: { data: [
        { ...PAGE('111', 'Beach Cafe'), instagram_business_account: { id: '178410001', username: 'beachcafe' } },
        { ...PAGE('222', 'Surf School'), instagram_business_account: { id: '178410002', username: 'surfschool' } },
      ] } };
      if (path === 'me') return { body: { id: '901', name: 'Page Admin' } };
      return metaError(100, 'Unsupported get request.');
    };
    const r = await client.resolveAccount('user-token', '178410002');
    expect(r).toMatchObject({ id: '178410002', username: 'surfschool', pageAccessToken: 'page-token-222' });
  });

  it('asks which account when the token covers several', async () => {
    answer = (u) => {
      const path = graphPath(u);
      if (path === 'me' && u.searchParams.get('fields') === 'id,name') return ME_USER;
      if (path === 'me/permissions') return { body: ME_USER.body.permissions };
    if (path === 'me/accounts') return { body: { data: [
        { ...PAGE('111', 'Beach Cafe'), instagram_business_account: { id: '178410001', username: 'beachcafe' } },
        { ...PAGE('222', 'Surf School'), instagram_business_account: { id: '178410002', username: 'surfschool' } },
      ] } };
      if (path === 'me') return { body: { id: '901', name: 'Page Admin' } };
      return metaError(100, 'Unsupported get request.');
    };
    const res = await connect('instagram', { accessToken: 'user-token' });
    expect(res.status).toBe(422);
    expect(res.body.error.details[0]).toMatchObject({ path: 'accountId', reason: 'account_selection_required' });
    const chosen = await connect('instagram', { accessToken: 'user-token', accountId: '178410002' });
    expect(chosen.status).toBe(202);
    expect(chosen.body.data.connection.accountHandle).toBe('@surfschool');
  });
});

describe('Instagram token checks before account discovery', () => {
  it('names the exact permission the token was generated without (stage: permissions)', async () => {
    answer = (u) => {
      const path = graphPath(u);
      if (path === 'me/permissions') return { body: granted('pages_show_list', 'public_profile') };
      if (path === 'me') return { body: { id: '901', name: 'Page Admin' } };
      return metaError(100, 'Unsupported get request.');
    };
    const res = await connect('instagram', { accessToken: 'EAAuser-token' });
    expect(res.status).toBe(403);
    expect(res.body.error.details).toEqual({ reason: 'permission_missing', stage: 'permissions' });
    expect(res.body.error.message).toMatch(/generated without instagram_basic\./);
  });

  it('refuses credentials that are certainly not a Meta token, without calling Meta', async () => {
    let calls = 0;
    answer = () => { calls += 1; return metaError(190, 'Malformed access token'); };
    const google = await connect('instagram', { accessToken: 'AIzaSyA1234567890abcdefghijklmnopqrstuv' });
    expect(google.status).toBe(400);
    expect(google.body.error.message).toMatch(/Google API key, not a Meta access token/);
    const wrapped = await connect('instagram', { accessToken: 'EAAfirst-half' + String.fromCharCode(10) + 'second-half' });
    expect(wrapped.body.error.message).toMatch(/space or line break/);
    const appToken = await connect('instagram', { accessToken: '123456789|abcdef' });
    expect(appToken.body.error.message).toMatch(/app or client token/);
    expect(calls).toBe(0);
  });

  it('when Meta refuses a token, says which Meta app issued it (debug_token) and that it is not this server’s app', async () => {
    answer = (u) => (graphPath(u) === 'debug_token'
      ? { body: { data: { app_id: '555000', application: 'Old Test App', is_valid: false } } }
      : metaError(200, 'API access blocked.'));
    const res = await connect('instagram', { accessToken: 'EAAblocked-token' });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toMatchObject({ reason: 'token_invalid', stage: 'token' });
    expect(res.body.error.message).toMatch(/issued by the Meta app “Old Test App” \(555000\), not by the app this server is set up for \(meta-app\)/);
  });
});

describe('connect request contract (web proxy and mobile app)', () => {
  it('sends Meta only the token from the request body, never the Media Navigator login token', async () => {
    const seen: string[] = [];
    // debug_token is authenticated with this server's own Meta app and inspects the user's token as input_token.
    answer = (u) => { seen.push(u.pathname.endsWith('/debug_token') ? u.searchParams.get('input_token') ?? '' : u.searchParams.get('access_token') ?? ''); return metaError(200, 'API access blocked.'); };
    const res = await connect('instagram', { accessToken: 'EAAbody-token-xyz' });
    expect(res.status).toBe(403);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((t) => t === 'EAAbody-token-xyz')).toBe(true);
    expect(seen.some((t) => t === user.accessToken)).toBe(false);
  });

  it('gives the web proxy and the mobile app the same answer for the same token, and logs a fingerprint, never the token', async () => {
    const { logger } = await import('../src/lib/logger.js');
    const info = vi.spyOn(logger, 'info');
    answer = () => metaError(200, 'API access blocked.');
    const token = 'EAAsame-token-for-both-clients';
    // Web: server-side proxy, no Origin, forwards the browser's user agent. App: browser calling the API directly.
    const web = await api().post('/api/v1/connections/instagram/connect').set(user.auth).set('User-Agent', 'Mozilla/5.0').send({ accessToken: token });
    const app = await api().post('/api/v1/connections/instagram/connect').set(user.auth).set('User-Agent', 'Mozilla/5.0').set('Origin', 'http://localhost:8081').send({ accessToken: token });
    expect([web.status, app.status]).toEqual([403, 403]);
    expect(web.body.error).toEqual(app.body.error);
    const attempts = info.mock.calls.filter(([m]) => m === 'connect attempt').map(([, f]) => f as any);
    expect(attempts.map((a) => a.client)).toEqual(['web-proxy', 'browser-direct (http://localhost:8081)']);
    expect(attempts[0].credential).toEqual(attempts[1].credential);
    expect(attempts[0].credential).toMatchObject({ kind: 'meta_user_or_page_token', length: token.length });
    expect(JSON.stringify(info.mock.calls)).not.toContain(token);
    info.mockRestore();
  });
});

describe('Meta OAuth (Instagram Login and Facebook Login)', () => {
  const startUrl = async (platform: string) => new URL((await api().post(`/api/v1/connections/${platform}/oauth/start`).set(user.auth)).body.data.authorizeUrl);

  it('sends each platform back to its own callback, so the state matches', async () => {
    expect((await startUrl('instagram')).searchParams.get('redirect_uri')).toBe('https://api.test.example/api/v1/connections/oauth/instagram/callback');
    expect((await startUrl('facebook')).searchParams.get('redirect_uri')).toBe('https://api.test.example/api/v1/connections/oauth/facebook/callback');
    expect((await startUrl('facebook')).searchParams.get('scope')).toContain('pages_read_user_content');
    expect((await startUrl('instagram')).searchParams.get('scope')).toBe('instagram_business_basic,instagram_business_manage_insights');
  });

  it('connects the real Instagram account after sign-in and never puts a token in the redirect', async () => {
    const state = (await startUrl('instagram')).searchParams.get('state')!;
    answer = (u) => {
      const path = graphPath(u);
      if (u.hostname === 'api.instagram.com') return { body: { access_token: 'IGshort-lived', user_id: '178410001' } };
      if (u.hostname === 'graph.instagram.com' && path === 'access_token') return { body: { access_token: 'IGlong-lived', expires_in: 5_184_000 } };
      if (u.hostname === 'graph.instagram.com' && path === 'me') return { body: { user_id: '178410001', username: 'beachcafe' } };
      if (path === 'me' && u.searchParams.get('fields') === 'id,name') return ME_USER;
      if (path === 'me/permissions') return { body: ME_USER.body.permissions };
    if (path === 'me/accounts') return { body: { data: [{ ...PAGE('111', 'Beach Cafe'), instagram_business_account: { id: '178410001', username: 'beachcafe' } }] } };
      if (path === 'me') return { body: { id: '901', name: 'Page Admin' } };
      return metaError(100, 'Unsupported get request.');
    };
    const res = await api().get('/api/v1/connections/oauth/instagram/callback').query({ code: 'auth-code', state });
    expect(res.headers.location).toBe('https://app.test.example/connections?oauth=connected&platform=instagram');
    const list = (await api().get('/api/v1/connections').set(user.auth)).body.data;
    expect(list.find((c: any) => c.platform === 'instagram')).toMatchObject({ connected: true, accountHandle: '@beachcafe', authMethod: 'oauth' });
  });

  it('a sign-in that finds no Instagram account comes back with the reason code only', async () => {
    const state = (await startUrl('instagram')).searchParams.get('state')!;
    answer = (u) => {
      const path = graphPath(u);
      if (u.hostname === 'api.instagram.com') return { body: { access_token: 'IGshort-lived', user_id: '178410001' } };
      if (u.hostname === 'graph.instagram.com' && path === 'access_token') return { body: { access_token: 'IGlong-lived', expires_in: 5_184_000 } };
      if (u.hostname === 'graph.instagram.com' && path === 'me') return { body: {} };
      if (path === 'me' && u.searchParams.get('fields') === 'id,name') return ME_USER;
      if (path === 'me/permissions') return { body: ME_USER.body.permissions };
    if (path === 'me/accounts') return { body: { data: [] } };
      if (u.hostname === 'graph.instagram.com') return metaError(190, 'Invalid OAuth access token - Cannot parse access token');
      return metaError(100, 'Unsupported get request.');
    };
    const res = await api().get('/api/v1/connections/oauth/instagram/callback').query({ code: 'auth-code', state });
    expect(res.headers.location).toBe('https://app.test.example/connections?oauth=failed&platform=instagram&reason=account_not_found');
  });
});

describe('LinkedIn Company Page connection', () => {
  const li = (acl: Answer, orgs: Record<string, string> = {}) => (u: URL): Answer => {
    if (u.pathname === '/v2/userinfo' || u.pathname === '/v2/me') return { status: 403, body: { status: 403, message: 'Not enough permissions to access: me.GET.NO_VERSION' } };
    if (u.pathname === '/rest/organizationAcls') return acl;
    const id = u.pathname.match(/^\/rest\/organizations\/(\d+)$/)?.[1];
    if (id && orgs[id]) return { body: { localizedName: orgs[id], vanityName: orgs[id].toLowerCase().replace(/\s/g, '') } };
    return { status: 404, body: { status: 404 } };
  };
  const acl = (...entries: Array<[string, string]>): Answer => ({ body: { elements: entries.map(([org, role]) => ({ organization: `urn:li:organization:${org}`, role, state: 'APPROVED' })) } });

  it('accepts a Community Management token without profile scope and connects the Page the member administers', async () => {
    answer = li(acl(['555', 'ADMINISTRATOR']), { 555: 'Acme Corp' });
    const res = await connect('linkedin', { accessToken: 'li-token' });
    expect(res.status).toBe(202);
    expect(res.body.data.connection.accountHandle).toBe('Acme Corp');
  });

  it('never connects an organization ID the member has no role on, and never falls back to a personal profile', async () => {
    answer = li(acl(['555', 'ADMINISTRATOR']), { 555: 'Acme Corp' });
    const res = await connect('linkedin', { accessToken: 'li-token', organizationId: '777' });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/Acme Corp \(555\)/);

    answer = li(acl());
    const none = await connect('linkedin', { accessToken: 'li-token' });
    expect(none.status).toBe(404);
    expect(none.body.error.message).toMatch(/Personal profiles can’t be connected/);
  });

  it('asks which Page when the member manages several, ignoring roles that cannot read analytics', async () => {
    answer = li(acl(['555', 'ADMINISTRATOR'], ['666', 'ANALYST'], ['888', 'RECRUITING_POSTER']), { 555: 'Acme Corp', 666: 'Beta Labs' });
    const res = await connect('linkedin', { accessToken: 'li-token' });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/You manage 2 Company Pages/);
    expect(res.body.error.message).not.toMatch(/888/);
  });

  it('explains missing Community Management approval (403) and a retired API version (426)', async () => {
    answer = li({ status: 403, body: { status: 403, message: 'Not enough permissions to access: organizationAcls.FINDER-roleAssignee' } });
    const denied = await connect('linkedin', { accessToken: 'li-token' });
    expect(denied.status).toBe(403);
    expect(denied.body.error.message).toMatch(/Community Management API/);

    answer = li({ status: 426, body: { status: 426, code: 'NONEXISTENT_VERSION', message: 'Requested version 20240101 is not active' } });
    const old = await connect('linkedin', { accessToken: 'li-token' });
    expect(old.status).toBe(502);
    expect(old.body.error.message).toMatch(/LINKEDIN_API_VERSION=/);
  });

  it('an invalid token is a 400 with a next step', async () => {
    answer = () => ({ status: 401, body: { status: 401, code: 'INVALID_ACCESS_TOKEN', message: 'Invalid access token' } });
    const res = await connect('linkedin', { accessToken: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Developer Portal/);
  });
});

describe('error translation', () => {
  it('maps Meta error codes to reasons, and sync classifies them by reason', () => {
    const cases: Array<[number, string, number | undefined, string]> = [
      [190, 'Error validating access token: Session has expired', 463, 'token_expired'],
      [190, 'Malformed access token', undefined, 'token_invalid'],
      [200, 'API access blocked.', undefined, 'app_restricted'],
      [10, '(#10) Requires pages_read_engagement', undefined, 'permission_missing'],
      [4, 'Application request limit reached', undefined, 'provider_unavailable'],
    ];
    for (const [code, message, sub, reason] of cases) {
      expect(describeMetaError('instagram', metaError(code, message, sub).body as any, 400).reason).toBe(reason);
    }
    expect(classifyFailure(describeMetaError('facebook', metaError(190, 'Malformed access token').body as any, 400))).toBe('expired');
    expect(classifyFailure(describeMetaError('facebook', metaError(200, 'API access blocked.').body as any, 400))).toBe('permission');
    expect(classifyFailure(describeMetaError('facebook', metaError(4, 'limit').body as any, 400))).toBe('transient');
  });
});
