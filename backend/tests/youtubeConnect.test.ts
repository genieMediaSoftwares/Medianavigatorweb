import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { startTestDb, stopTestDb, clearDb, api, registerUser } from './helpers.js';

// Real YouTube adapter; only Google's HTTP answers are simulated.
let answer: (url: string) => { status?: number; body: unknown } = () => ({ status: 404, body: {} });
vi.mock('../src/lib/http.js', async (orig) => {
  const real = await orig<typeof import('../src/lib/http.js')>();
  return { ...real, httpFetch: vi.fn(async (input: string | URL) => { const a = answer(String(input)); return new Response(JSON.stringify(a.body), { status: a.status ?? 200 }); }) };
});

const KEY = 'AIzaSyA1234567890abcdefghijklmnopqrstuv';
const CHANNEL = { id: 'UCownChannel000000000000', snippet: { title: 'My Channel', customUrl: '@mychannel' }, statistics: { videoCount: '0' }, contentDetails: { relatedPlaylists: { uploads: 'UUownChannel000000000000' } } };

describe('POST /connections/youtube/connect with a Data API key', () => {
  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(clearDb);

  it('connects the exact channel and records that it is an API-key (public data) connection', async () => {
    answer = (url) => (url.includes('/channels') && url.includes('forHandle=%40mychannel') ? { body: { items: [CHANNEL] } } : { status: 404, body: {} });
    const u = await registerUser('ytkey@test.example');
    const res = await api().post('/api/v1/connections/youtube/connect').set(u.auth).send({ apiKey: KEY, channelQuery: '@mychannel' });
    expect(res.status).toBeLessThan(300);
    expect(res.body.data.connection).toMatchObject({ connected: true, accountHandle: '@mychannel', authMethod: 'api_key' });
    // the key is never returned
    expect(JSON.stringify(res.body)).not.toContain(KEY);
    const list = (await api().get('/api/v1/connections').set(u.auth)).body.data;
    expect(list.find((c: any) => c.platform === 'youtube').authMethod).toBe('api_key');
  });

  it('answers provider problems with a clear 400, not “An unexpected error occurred”', async () => {
    const u = await registerUser('yterr@test.example');
    answer = () => ({ status: 403, body: { error: { code: 403, errors: [{ reason: 'accessNotConfigured' }], details: [{ reason: 'SERVICE_DISABLED' }] } } });
    const disabled = await api().post('/api/v1/connections/youtube/connect').set(u.auth).send({ apiKey: KEY, channelQuery: '@mychannel' });
    expect(disabled.status).toBe(400);
    expect(disabled.body.error.message).toMatch(/YouTube Data API v3 isn’t enabled/);

    answer = () => ({ body: { items: [] } });
    const missing = await api().post('/api/v1/connections/youtube/connect').set(u.auth).send({ apiKey: KEY, channelQuery: '@nobodyhere' });
    expect(missing.status).toBe(400);
    expect(missing.body.error.message).toMatch(/No YouTube channel matches @nobodyhere/);

    const wrongField = await api().post('/api/v1/connections/youtube/connect').set(u.auth).send({ accessToken: KEY });
    expect(wrongField.status).toBe(400);
    expect(wrongField.body.error.message).toMatch(/API key, not a Google sign-in/);
  });
});
