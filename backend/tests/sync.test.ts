import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { startTestDb, stopTestDb, clearDb, api, registerUser } from './helpers.js';
import { fake, fakeAdapter, makeMedia } from './fakes.js';

vi.mock('../src/integrations/registry.js', async () => {
  const { fakeAdapter } = await import('./fakes.js');
  const adapters: Record<string, any> = {};
  return {
    PLATFORMS: ['instagram', 'facebook', 'youtube', 'linkedin'],
    getAdapter: (p: string) => (adapters[p] ??= fakeAdapter(p as any)),
  };
});

import { getAdapter } from '../src/integrations/registry.js';
import { sealCredentials, readCredentials } from '../src/services/sync.service.js';
import { connectionRepository } from '../src/repositories/connection.repository.js';
import { syncService } from '../src/services/sync.service.js';
import { enqueueDueSyncs } from '../src/jobs/sync/scheduler.js';
import { ConnectedAccount } from '../src/models/ConnectedAccount.js';
import { ContentItem } from '../src/models/ContentItem.js';
import { SyncRun } from '../src/models/SyncRun.js';
import { ContentAnalysis } from '../src/models/ContentAnalysis.js';
import { toObjectId } from '../src/lib/ids.js';
import { Analytics } from '../src/models/Analytics.js';
import { Notification } from '../src/models/Notification.js';
import { syncRunRepository } from '../src/repositories/syncRun.repository.js';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => { await clearDb(); fake.reset(); fake.items = makeMedia(12, 'instagram'); });

const connect = (u: { auth: any }, platform = 'instagram', body: any = { accessToken: 'SECRET-TOKEN-123' }) =>
  api().post(`/api/v1/connections/${platform}/connect`).set(u.auth).send(body);
const drain = async () => { let n = 0; while (await syncService.runOne('t')) n++; return n; };

describe('connecting a platform', () => {
  it('validates, stores credentials encrypted, queues the first sync, and never echoes secrets', async () => {
    const u = await registerUser('c1@test.example');
    const res = await connect(u);
    expect(res.status).toBe(202);
    expect(JSON.stringify(res.body)).not.toContain('SECRET-TOKEN-123');
    expect(res.body.data.connection.status).toBe('syncing');
    expect(res.body.data.syncRun).toMatchObject({ status: 'queued', type: 'initial' });

    const raw = await mongoose.connection.db!.collection('connectedaccounts').findOne({ userId: new mongoose.Types.ObjectId(u.id) });
    expect(raw!.credentialsEnc.startsWith('v1.')).toBe(true);
    expect(JSON.stringify(raw)).not.toContain('SECRET-TOKEN-123');

    const list = await api().get('/api/v1/connections').set(u.auth);
    expect(JSON.stringify(list.body)).not.toMatch(/SECRET-TOKEN|credentialsEnc/);
    expect(list.body.data).toHaveLength(4);
  });

  it('refreshes Instagram access without a separate refresh token and persists it encrypted', async () => {
    const u = await registerUser('ig-refresh@test.example');
    await connect(u);
    const account = await ConnectedAccount.findOne({ userId: u.id });
    await ConnectedAccount.updateOne({ _id: account!._id }, { credentialsEnc: sealCredentials({ instagramLogin: true, accountId: 'instagram-acct-1', accessToken: 'old-token', expiresAt: new Date(Date.now() + 86400000).toISOString() }) });
    const adapter = getAdapter('instagram');
    adapter.refreshCredentials = vi.fn(async (c) => ({ ...c, accessToken: 'new-private-token', expiresAt: new Date(Date.now() + 60 * 86400000).toISOString() }));
    try {
      await drain();
      expect(adapter.refreshCredentials).toHaveBeenCalledOnce();
      const saved = await connectionRepository.findByIdWithCredentials(account!._id);
      expect(readCredentials(saved!).accessToken).toBe('new-private-token');
      expect(saved!.credentialsEnc).not.toContain('new-private-token');
      expect(saved!.status).toBe('sync_complete');
    } finally { delete adapter.refreshCredentials; }
  });

  it('rejects invalid provider credentials without storing anything', async () => {
    const u = await registerUser('c2@test.example');
    fake.validateResult = { isValid: false, error: 'Malformed access token' };
    const res = await connect(u);
    expect(res.status).toBe(400);
    expect(await ConnectedAccount.countDocuments()).toBe(0);
  });

  it('will not let a second user take over a provider account that is already connected', async () => {
    const a = await registerUser('own-a@test.example');
    const b = await registerUser('own-b@test.example');
    expect((await connect(a)).status).toBe(202);
    const second = await connect(b);
    expect(second.status).toBe(409);
    // Original owner's connection remains intact
    const account = await ConnectedAccount.findOne({ userId: a.id, active: true });
    expect(account).not.toBeNull();
    expect(await ConnectedAccount.countDocuments({ userId: b.id, active: true })).toBe(0);
  });

  it('concurrent duplicate connection attempts still allow only one owner', async () => {
    const a = await registerUser('race-c1@test.example');
    const b = await registerUser('race-c2@test.example');
    const [resA, resB] = await Promise.all([connect(a), connect(b)]);
    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([202, 409]);
    expect(await ConnectedAccount.countDocuments({ active: true })).toBe(1);
  });
});

describe('sync engine', () => {
  it('discards an in-flight provider response when the account is disconnected mid-sync and closes the run', async () => {
    const u = await registerUser('mid-sync@test.example');
    await connect(u);
    const adapter = getAdapter('instagram');
    const original = adapter.fetchContent;
    adapter.fetchContent = vi.fn(async (...args: Parameters<typeof original>) => {
      const result = await original(...args);
      expect((await api().post('/api/v1/connections/instagram/disconnect').set(u.auth)).status).toBe(200);
      return result;
    });
    try { await drain(); } finally { adapter.fetchContent = original; }
    expect(await ContentItem.countDocuments({ userId: toObjectId(u.id) })).toBe(0);
    const run = await SyncRun.findOne({ userId: toObjectId(u.id) }).lean();
    expect(run).toMatchObject({ status: 'cancelled', errorKind: 'not_connected' });
    expect(run!.active).toBeUndefined();
  });

  it('runs the first sync end to end and stores normalized content, a snapshot and a notification', async () => {
    const u = await registerUser('s1@test.example');
    await connect(u);
    expect(await drain()).toBe(1);

    expect(await ContentItem.countDocuments()).toBe(12);
    const conn = (await api().get('/api/v1/connections').set(u.auth)).body.data.find((c: any) => c.platform === 'instagram');
    expect(conn).toMatchObject({ connected: true, status: 'sync_complete', dataPointsCount: 12 });
    expect(conn.sync.state).toBe('synced');
    expect(conn.lastSyncedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(await Analytics.countDocuments()).toBe(1);
    expect(await Notification.countDocuments({ type: 'sync_completed' })).toBe(1);
    const run = await SyncRun.findOne().lean();
    expect(run).toMatchObject({ status: 'succeeded', itemsFetched: 12, itemsCreated: 12 });
    expect(run!.active).toBeUndefined();
  });

  it('is idempotent: re-syncing the same content updates, never duplicates', async () => {
    const u = await registerUser('s2@test.example');
    await connect(u);
    await drain();
    fake.items[0] = { ...fake.items[0], views: 99999 };
    const second = await api().post('/api/v1/connections/instagram/sync').set(u.auth);
    expect(second.status).toBe(202);
    expect(second.body.data.syncRun.type).toBe('manual');
    await drain();
    expect(await ContentItem.countDocuments()).toBe(12);
    const run = await SyncRun.findOne({ type: 'manual' }).lean();
    expect(run).toMatchObject({ itemsCreated: 0, itemsUpdated: 12 });
    expect((await ContentItem.findOne({ providerMediaId: '1' }).lean())!.views).toBe(99999);
  });

  it('a double click returns the run that is already queued instead of creating another', async () => {
    const u = await registerUser('s3@test.example');
    await connect(u);
    await drain();
    const a = await api().post('/api/v1/connections/instagram/sync').set(u.auth);
    const b = await api().post('/api/v1/connections/instagram/sync').set(u.auth);
    expect(b.body.data.alreadyQueued).toBe(true);
    expect(b.body.data.syncRun.id).toBe(a.body.data.syncRun.id);
    expect(await SyncRun.countDocuments({ active: true })).toBe(1);
  });

  it('two workers racing for the queue never execute the same run twice', async () => {
    const a = await registerUser('race-a@test.example');
    const b = await registerUser('race-b@test.example');
    fake.accountId = 'a'; await connect(a);
    fake.accountId = 'b'; await connect(b, 'instagram', { accessToken: 'tok-b' });
    const results = await Promise.all([syncService.runOne('w1'), syncService.runOne('w2'), syncService.runOne('w3')]);
    expect(results.filter(Boolean)).toHaveLength(2);
    const runs = await SyncRun.find().lean();
    expect(runs.map((r) => r.attempts)).toEqual([1, 1]);
    expect(runs.every((r) => r.status === 'succeeded')).toBe(true);
  });

  it('marks a connection expired on auth failure, never retries it, and refuses further syncs until reconnect', async () => {
    const u = await registerUser('s4@test.example');
    await connect(u);
    fake.fetchError = new Error('Your Meta connection has expired. Reconnect to continue analyzing your media.');
    await drain();
    expect(fake.fetchCalls).toBe(1);
    const run = await SyncRun.findOne().lean();
    expect(run).toMatchObject({ status: 'failed', errorKind: 'expired', attempts: 1 });
    const conn = (await api().get('/api/v1/connections').set(u.auth)).body.data.find((c: any) => c.platform === 'instagram');
    expect(conn.status).toBe('connection_expired');
    expect((await api().post('/api/v1/connections/instagram/sync').set(u.auth)).status).toBe(400);
    expect(await Notification.countDocuments({ type: 'connection_expired' })).toBe(1);
    const alerts = await api().get('/api/v1/alerts').set(u.auth);
    expect(alerts.body.data.some((a: any) => /expired/i.test(a.title))).toBe(true);
    // reconnecting clears the state
    fake.fetchError = null;
    expect((await connect(u)).status).toBe(202);
    await drain();
    expect((await api().get('/api/v1/connections').set(u.auth)).body.data.find((c: any) => c.platform === 'instagram').status).toBe('sync_complete');
  });

  it('retries transient failures with backoff and then succeeds', async () => {
    const u = await registerUser('s5@test.example');
    await connect(u);
    fake.failTimes = 1;
    expect(await syncService.runOne('t')).toBe(true);
    let run = await SyncRun.findOne().lean();
    expect(run).toMatchObject({ status: 'queued', attempts: 1 });
    expect(run!.queuedAt.getTime()).toBeGreaterThan(Date.now() - 1000);
    await SyncRun.updateOne({}, { $set: { queuedAt: new Date(Date.now() - 1000) } }); // skip the backoff wait
    expect(await syncService.runOne('t')).toBe(true);
    run = await SyncRun.findOne().lean();
    expect(run).toMatchObject({ status: 'succeeded', attempts: 2 });
    expect(await ContentItem.countDocuments()).toBe(12);
  });

  it('gives up after the configured attempts and reports sync_failed', async () => {
    const u = await registerUser('s6@test.example');
    await connect(u);
    fake.failTimes = 99;
    for (let i = 0; i < 5; i++) { await SyncRun.updateMany({ active: true }, { $set: { queuedAt: new Date(Date.now() - 1000) } }); await syncService.runOne('t'); }
    const run = await SyncRun.findOne().lean();
    expect(run).toMatchObject({ status: 'failed', attempts: 3 });
    expect((await api().get('/api/v1/connections').set(u.auth)).body.data.find((c: any) => c.platform === 'instagram').status).toBe('sync_failed');
  });

  it('records an incomplete provider result as partial, not success, and keeps the data it got', async () => {
    const u = await registerUser('s7@test.example');
    await connect(u);
    fake.partialReason = 'Fetched 12 of 40 items reported by Instagram';
    await drain();
    const run = await SyncRun.findOne().lean();
    expect(run).toMatchObject({ status: 'partial' });
    expect(run!.errorSummary).toContain('12 of 40');
    expect(await ContentItem.countDocuments()).toBe(12);
  });

  it('a complete provider list removes stored items no longer on the account, with their saved analyses', async () => {
    const u = await registerUser('s7b@test.example');
    await connect(u);
    await drain();
    expect(await ContentItem.countDocuments()).toBe(12);
    const gone = fake.items.slice(10);
    await ContentAnalysis.create(gone.map((m) => ({ userId: toObjectId(u.id), mediaId: m.id, analysisType: 'deep', analysisVersion: 'v', platform: m.platform, contentType: m.contentType })));
    fake.items = fake.items.slice(0, 10);
    fake.authoritative = true;
    await api().post('/api/v1/connections/instagram/sync').set(u.auth);
    await drain();
    expect(await ContentItem.countDocuments()).toBe(10);
    expect(await ContentAnalysis.countDocuments()).toBe(0);
    const acc = await ConnectedAccount.findOne().lean();
    expect(acc).toMatchObject({ dataPointsCount: 10 });
    expect(acc!.statusMessage).toMatch(/Removed 2 no longer on the account/);
  });

  it('an incomplete provider list never removes stored history', async () => {
    const u = await registerUser('s7c@test.example');
    await connect(u);
    await drain();
    fake.items = fake.items.slice(0, 3);
    await api().post('/api/v1/connections/instagram/sync').set(u.auth);
    await drain();
    expect(await ContentItem.countDocuments()).toBe(12);
  });

  it('flags missing permissions truthfully and stops scheduling', async () => {
    const u = await registerUser('s8@test.example');
    await connect(u, 'linkedin');
    fake.items = [];
    fake.permissionError = { message: 'Additional LinkedIn Community Management permissions required.', missing: ['r_organization_social'] };
    await drain();
    const conn = (await api().get('/api/v1/connections').set(u.auth)).body.data.find((c: any) => c.platform === 'linkedin');
    expect(conn).toMatchObject({ status: 'permission_required', missingPermissions: ['r_organization_social'] });
    expect(conn.sync.nextSyncAt).toBeNull();
  });

  it('recovers runs whose worker died (expired lease) and does not recover live leases', async () => {
    const u = await registerUser('s9@test.example');
    await connect(u);
    await SyncRun.updateOne({}, { $set: { status: 'running', attempts: 1, leaseOwner: 'dead', leaseExpiresAt: new Date(Date.now() + 60_000) } });
    expect(await syncService.runOne('t')).toBe(false); // lease still valid
    await SyncRun.updateOne({}, { $set: { leaseExpiresAt: new Date(Date.now() - 1000) } });
    expect(await syncService.runOne('t')).toBe(true);
    expect((await SyncRun.findOne().lean())!.status).toBe('succeeded');
  });

  it('the scheduler only queues live, healthy accounts that are due', async () => {
    const u = await registerUser('s10@test.example');
    await connect(u);
    await drain();
    expect(await enqueueDueSyncs()).toBe(0); // next sync is an hour away
    await ConnectedAccount.updateOne({}, { $set: { nextSyncAt: new Date(Date.now() - 1000) } });
    expect(await enqueueDueSyncs()).toBe(1);
    expect(await enqueueDueSyncs()).toBe(0); // already queued
    const run = await SyncRun.findOne({ type: 'scheduled' }).lean();
    expect(run).toBeTruthy();
    await syncRunRepository.finish(run!._id, 'cancelled', {});
    await ConnectedAccount.updateOne({}, { $set: { status: 'connection_expired' } });
    expect(await enqueueDueSyncs()).toBe(0);
  });

  it('the external trigger endpoint requires the shared secret', async () => {
    expect((await api().post('/api/v1/internal/jobs/run')).status).toBe(403);
    expect((await api().post('/api/v1/internal/jobs/run').set('x-jobs-secret', 'wrong')).status).toBe(403);
    const ok = await api().post('/api/v1/internal/jobs/run').set('x-jobs-secret', 'jobs-secret-for-tests');
    expect(ok.status).toBe(200);
  });
});

describe('data lifecycle and ownership', () => {
  it('disconnect wipes credentials, stops sync, and retains history', async () => {
    const u = await registerUser('d1@test.example');
    await connect(u);
    await drain();
    const res = await api().post('/api/v1/connections/instagram/disconnect').set(u.auth);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ connected: false, status: 'not_connected' });
    const raw = await mongoose.connection.db!.collection('connectedaccounts').findOne({});
    expect(raw!.credentialsEnc).toBeNull();
    expect(raw!.nextSyncAt).toBeNull();
    expect(await ContentItem.countDocuments()).toBe(12); // retained
    // disconnected accounts are excluded from analytics and media feeds
    expect((await api().get('/api/v1/media').set(u.auth)).body.data).toHaveLength(0);
    expect((await api().post('/api/v1/connections/instagram/sync').set(u.auth)).status).toBe(404);
  });

  it('reconnecting a different account replaces its content instead of mixing in the previous channel', async () => {
    const u = await registerUser('switch@test.example');
    await connect(u);
    await drain();
    expect(await ContentItem.countDocuments()).toBe(12); // the original channel

    // Same user and platform, but the connection now resolves to a different provider account with new media ids.
    fake.accountId = 'acct-2';
    fake.items = makeMedia(5, 'instagram').map((m, i) => ({ ...m, id: `nw_${i + 1}`, platformContentId: `new-${i + 1}` }));
    expect((await connect(u)).status).toBe(202);
    await drain();

    const items = await ContentItem.find().lean();
    expect(items).toHaveLength(5); // old channel's posts are gone, not merged
    expect(items.every((i) => i.providerMediaId.startsWith('new-'))).toBe(true);
    expect(await Analytics.countDocuments()).toBe(1); // only the new account's snapshot remains
  });

  it('isolates users: nobody can read another user’s content, sync runs or analytics', async () => {
    const a = await registerUser('iso-a@test.example');
    const b = await registerUser('iso-b@test.example');
    await connect(a);
    await drain();
    const feedA = await api().get('/api/v1/media').set(a.auth);
    expect(feedA.body.data).toHaveLength(12);
    const runId = (await SyncRun.findOne().lean())!._id;

    expect((await api().get('/api/v1/media').set(b.auth)).body.data).toHaveLength(0);
    expect((await api().get(`/api/v1/media/${feedA.body.data[0].id}`).set(b.auth)).status).toBe(404);
    expect((await api().get(`/api/v1/connections/sync-runs/${runId}`).set(b.auth)).status).toBe(404);
    expect((await api().get(`/api/v1/connections/sync-runs/${runId}`).set(a.auth)).status).toBe(200);
    expect((await api().get('/api/v1/intelligence/overview').set(b.auth)).body.data.hasData).toBe(false);
    expect((await api().get('/api/v1/alerts').set(b.auth)).body.data).toHaveLength(0);
    expect((await api().post('/api/v1/connections/instagram/sync').set(b.auth)).status).toBe(404);
    // a client-supplied userId is simply not an accepted field
    expect((await api().get('/api/v1/media?userId=' + a.id).set(b.auth)).status).toBe(422);
  });

  it('paginates the media feed with cursors without gaps or duplicates', async () => {
    const u = await registerUser('pg@test.example');
    await connect(u);
    await drain();
    const seen: string[] = [];
    let cursor: string | undefined;
    for (let i = 0; i < 10; i++) {
      const res = await api().get('/api/v1/media').query({ limit: 5, ...(cursor ? { cursor } : {}) }).set(u.auth);
      expect(res.status).toBe(200);
      seen.push(...res.body.data.map((m: any) => m.id));
      cursor = res.body.meta.nextCursor ?? undefined;
      if (!cursor) break;
    }
    expect(seen).toHaveLength(12);
    expect(new Set(seen).size).toBe(12);
    expect((await api().get('/api/v1/media?limit=100000').set(u.auth)).status).toBe(422);
  });

  it('deleting an account removes that user’s data only', async () => {
    const a = await registerUser('del-a@test.example');
    const b = await registerUser('del-b@test.example');
    fake.accountId = 'a'; await connect(a);
    fake.accountId = 'b'; await connect(b, 'instagram', { accessToken: 'tok-b' });
    await drain();
    expect(await ContentItem.countDocuments()).toBe(24);
    // A wrong confirmation password is a 400 that keeps the session; only an invalid session is a 401.
    expect((await api().delete('/api/v1/users/me').set(a.auth).send({ password: 'wrong-Pass-1' })).status).toBe(400);
    expect((await api().delete('/api/v1/users/me').set(a.auth).send({ password: 'Sup3rSecret99' })).status).toBe(200);
    expect(await ContentItem.countDocuments({ userId: new mongoose.Types.ObjectId(a.id) })).toBe(0);
    expect(await ContentItem.countDocuments({ userId: new mongoose.Types.ObjectId(b.id) })).toBe(12);
    expect((await api().get('/api/v1/auth/me').set(a.auth)).status).toBe(401);
    expect((await api().post('/api/v1/auth/login').send({ email: 'del-a@test.example', password: 'Sup3rSecret99' })).status).toBe(401);
    expect((await api().get('/api/v1/media').set(b.auth)).body.data).toHaveLength(12);
  });
});
describe('Facebook metrics end to end (provider result → database → API)', () => {
  it('stores exact numbers and real zeros, keeps unavailable metrics N/A, reports missing permissions, and never duplicates posts', async () => {
    const u = await registerUser('fb-metrics@test.example');
    const [measured, zero, unread] = makeMedia(3, 'facebook');
    fake.items = [
      { ...measured, views: 5400, reach: 4100, likes: 120, comments: 15, shares: 7, engagementRate: 2.63, missingMetrics: [] },
      { ...zero, views: 0, reach: 0, likes: 0, comments: 0, shares: 0, engagementRate: 0, missingMetrics: ['engagementRate'] },
      { ...unread, views: 0, reach: 0, likes: 0, comments: 0, shares: 3, engagementRate: 0, missingMetrics: ['views', 'reach', 'likes', 'comments', 'engagementRate'] },
    ];
    fake.partialReason = 'Some numbers are unavailable because the token was generated without pages_read_user_content (reactions, comments).';
    fake.metricPermissionsMissing = ['pages_read_user_content'];
    await connect(u, 'facebook');
    await drain();

    const media = (await api().get('/api/v1/media?platform=facebook&limit=10').set(u.auth)).body.data as any[];
    const byId = (id: string) => media.find((m) => m.id === id);
    expect(byId(measured.id)).toMatchObject({ views: 5400, reach: 4100, likes: 120, comments: 15, shares: 7 });
    expect(byId(measured.id).unavailableMetrics).not.toEqual(expect.arrayContaining(['views', 'reach', 'likes', 'comments']));
    // Real zeros reach the client as 0 and are not flagged; unread metrics are flagged so the app shows N/A, not 0.
    expect(byId(zero.id)).toMatchObject({ views: 0, reach: 0, likes: 0, comments: 0 });
    expect(byId(zero.id).unavailableMetrics).not.toEqual(expect.arrayContaining(['views', 'reach']));
    expect(byId(unread.id).unavailableMetrics).toEqual(expect.arrayContaining(['views', 'reach', 'likes', 'comments']));
    expect(byId(unread.id).shares).toBe(3);

    const fb = (await api().get('/api/v1/connections').set(u.auth)).body.data.find((c: any) => c.platform === 'facebook');
    expect(fb.missingPermissions).toEqual(['pages_read_user_content']);
    expect(fb.statusMessage).toMatch(/pages_read_user_content/);
    expect((await SyncRun.findOne({ platform: 'facebook' }).sort({ queuedAt: -1 }).lean())!.status).toBe('partial');
    expect(await Notification.exists({ title: /synced, some data unavailable/ })).toBeTruthy();
    // The dashboard snapshot counts only posts that had the number: the unread post adds nothing and is not a 0.
    const snap = (await Analytics.findOne({ platform: 'facebook' }).lean())!;
    expect(snap).toMatchObject({ contentCount: 3, totalViews: 5400, viewsMeasured: 2, engagementMeasured: 1, totalShares: 10 });

    // A second sync updates the same posts in place.
    await api().post('/api/v1/connections/facebook/sync').set(u.auth);
    await drain();
    expect(await ContentItem.countDocuments({ platform: 'facebook' })).toBe(3);
  });
});
void fakeAdapter;

describe('scheduler backlog fairness', () => {
  it('advances past already queued accounts to enqueue later due accounts', async () => {
    const user = await registerUser('scheduler-fairness@test.example');
    const due = new Date(Date.now() - 60_000);
    await ConnectedAccount.insertMany(['instagram', 'youtube', 'facebook'].map(platform => ({ userId: toObjectId(user.id), platform, providerAccountId: `${platform}-account`, handle: '@account', status: 'sync_complete', active: true, nextSyncAt: due })));
    expect(await enqueueDueSyncs(1)).toBe(1);
    expect(await enqueueDueSyncs(1)).toBe(1);
    expect(await enqueueDueSyncs(1)).toBe(1);
    expect(await SyncRun.countDocuments({ active: true })).toBe(3);
    expect(await enqueueDueSyncs(1)).toBe(0);
  });
});

describe('sync lease fencing', () => {
  it('does not let an old worker finish or requeue a run claimed by another owner', async () => {
    const u = await registerUser('lease-fence@test.example');
    await connect(u);
    const run = await syncRunRepository.claimNext('first', 30, 3);
    await SyncRun.updateOne({ _id: run!._id }, { leaseOwner: 'replacement', leaseExpiresAt: new Date(Date.now() + 30000) });
    expect(await syncRunRepository.ownsLease(run!._id, 'first')).toBeNull();
    await syncRunRepository.finish(run!._id, 'succeeded', {}, 'first');
    await syncRunRepository.requeue(run!._id, 0, 'old failure', 'first');
    expect(await SyncRun.findById(run!._id)).toMatchObject({ status: 'running', leaseOwner: 'replacement', active: true });
    await syncRunRepository.finish(run!._id, 'succeeded', {}, 'replacement');
    expect((await SyncRun.findById(run!._id))?.status).toBe('succeeded');
  });
});
