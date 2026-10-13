import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { startTestDb, stopTestDb, clearDb, api, registerUser } from './helpers.js';
import { fake, makeMedia } from './fakes.js';

vi.mock('../src/integrations/registry.js', async () => {
  const { fakeAdapter } = await import('./fakes.js');
  const adapters: Record<string, any> = {};
  return { PLATFORMS: ['instagram', 'facebook', 'youtube', 'linkedin'], getAdapter: (p: string) => (adapters[p] ??= fakeAdapter(p as any)) };
});
import { syncService } from '../src/services/sync.service.js';

describe('notification preferences', () => {
  beforeAll(startTestDb);
  afterAll(stopTestDb);
  beforeEach(async () => { await clearDb(); fake.reset(); });
  const drain = async () => { while (await syncService.runOne('t')); };
  const types = async (auth: Record<string, string>) => ((await api().get('/api/v1/notifications').set(auth)).body.data as Array<{ type: string }>).map((n) => n.type);

  it('starts with every category on', async () => {
    const u = await registerUser('prefs@test.example');
    const me = (await api().get('/api/v1/profiles/me').set(u.auth)).body.data;
    expect(me.profile.notificationPrefs).toEqual({ syncUpdates: true, connectionProblems: true, performanceAlerts: true });
  });

  it('saves one category at a time without resetting the others', async () => {
    const u = await registerUser('merge@test.example');
    const a = await api().patch('/api/v1/profiles/me').set(u.auth).send({ notificationPrefs: { syncUpdates: false } });
    expect(a.status).toBe(200);
    expect(a.body.data.profile.notificationPrefs).toEqual({ syncUpdates: false, connectionProblems: true, performanceAlerts: true });
    const b = await api().patch('/api/v1/profiles/me').set(u.auth).send({ notificationPrefs: { performanceAlerts: false } });
    expect(b.body.data.profile.notificationPrefs).toEqual({ syncUpdates: false, connectionProblems: true, performanceAlerts: false });
    // and it persists
    expect((await api().get('/api/v1/auth/me').set(u.auth)).body.data.profile.notificationPrefs.syncUpdates).toBe(false);
    // the name was not touched
    expect(b.body.data.profile.fullName).toBe('Test User');
  });

  it('rejects unknown categories and empty updates', async () => {
    const u = await registerUser('bad@test.example');
    expect((await api().patch('/api/v1/profiles/me').set(u.auth).send({ notificationPrefs: { marketing: true } })).status).toBe(422);
    expect((await api().patch('/api/v1/profiles/me').set(u.auth).send({ notificationPrefs: {} })).status).toBe(422);
    expect((await api().patch('/api/v1/profiles/me').set(u.auth).send({ notificationPrefs: { syncUpdates: 'no' } })).status).toBe(422);
  });

  it('really stops notifications of a category that is turned off', async () => {
    const on = await registerUser('on@test.example');
    fake.items = makeMedia(8, 'instagram');
    await api().post('/api/v1/connections/instagram/connect').set(on.auth).send({ accessToken: 'tok' });
    await drain();
    expect(await types(on.auth)).toContain('sync_completed');

    await clearDb();
    fake.reset();
    const off = await registerUser('off@test.example');
    await api().patch('/api/v1/profiles/me').set(off.auth).send({ notificationPrefs: { syncUpdates: false } });
    fake.items = makeMedia(8, 'instagram');
    await api().post('/api/v1/connections/instagram/connect').set(off.auth).send({ accessToken: 'tok' });
    await drain();
    expect(await types(off.auth)).not.toContain('sync_completed');
  });

  it('still delivers connection problems when only sync updates are off', async () => {
    const u = await registerUser('fail@test.example');
    await api().patch('/api/v1/profiles/me').set(u.auth).send({ notificationPrefs: { syncUpdates: false } });
    fake.items = makeMedia(3, 'instagram');
    fake.fetchError = new Error('Provider exploded');
    await api().post('/api/v1/connections/instagram/connect').set(u.auth).send({ accessToken: 'tok' });
    await drain();
    expect(await types(u.auth)).toContain('sync_failed');

    await api().patch('/api/v1/profiles/me').set(u.auth).send({ notificationPrefs: { connectionProblems: false } });
    await api().post('/api/v1/connections/instagram/sync').set(u.auth);
    await drain();
    expect((await types(u.auth)).filter((t) => t === 'sync_failed')).toHaveLength(1); // no new one
  });
});
