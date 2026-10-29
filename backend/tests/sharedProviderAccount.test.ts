import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { startTestDb, stopTestDb, clearDb, api, registerUser, PASSWORD } from './helpers.js';
import { fake, makeMedia } from './fakes.js';

vi.mock('../src/integrations/registry.js', async () => {
  const { fakeAdapter } = await import('./fakes.js');
  const adapters: Record<string, any> = {};
  return { PLATFORMS: ['instagram', 'facebook', 'youtube', 'linkedin'], getAdapter: (p: string) => (adapters[p] ??= fakeAdapter(p as any)) };
});

import { syncService, readCredentials } from '../src/services/sync.service.js';
import { connectionRepository } from '../src/repositories/connection.repository.js';
import { ConnectedAccount } from '../src/models/ConnectedAccount.js';
import { ContentItem } from '../src/models/ContentItem.js';
import { toObjectId } from '../src/lib/ids.js';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => { await clearDb(); fake.reset(); fake.items = makeMedia(6, 'instagram'); });

const connect = (u: { auth: any }, accessToken: string) => api().post('/api/v1/connections/instagram/connect').set(u.auth).send({ accessToken });
const drain = async () => { while (await syncService.runOne('t')); };

describe('single-owner social accounts (website and mobile share the same policy)', () => {
  it('rejects another owner without changing the first owner’s credentials or content', async () => {
    const a = await registerUser('share-a@test.example');
    const b = await registerUser('share-b@test.example');
    expect((await connect(a, 'TOKEN-OF-A')).status).toBe(202);
    const second = await connect(b, 'TOKEN-OF-B');
    await drain();

    expect(second.status).toBe(409);

    const accA = (await connectionRepository.findByIdWithCredentials((await ConnectedAccount.findOne({ userId: a.id }))!._id))!;
    expect(await ConnectedAccount.countDocuments({ userId: b.id })).toBe(0);
    expect(readCredentials(accA).accessToken).toBe('TOKEN-OF-A'); // B's connect did not replace A's token

    // Each user's copy of the posts belongs to that user and their own connection only.
    expect(await ContentItem.countDocuments({ userId: toObjectId(a.id), connectedAccountId: accA._id })).toBe(6);
    expect(await ContentItem.countDocuments({ userId: toObjectId(b.id) })).toBe(0);
    expect(await ContentItem.countDocuments({ userId: toObjectId(a.id), connectedAccountId: { $ne: accA._id } })).toBe(0);

    // A post id from A's feed is not readable with B's session, and the API never returns tokens.
    const aFeed = (await api().get('/api/v1/media?limit=24').set(a.auth)).body.data as Array<{ id: string }>;
    const bFeed = (await api().get('/api/v1/media?limit=24').set(b.auth)).body;
    expect(JSON.stringify(bFeed)).not.toMatch(/TOKEN-OF-|credentialsEnc/);
    const bConnections = (await api().get('/api/v1/connections').set(b.auth)).body;
    expect(JSON.stringify(bConnections)).not.toMatch(/TOKEN-OF-|credentialsEnc/);
    expect(aFeed.length).toBe(6);

    // B disconnecting or deleting their account leaves A's connection, token and posts untouched.
    expect((await api().delete('/api/v1/users/me').set(b.auth).send({ password: PASSWORD })).status).toBe(200);
    const after = (await connectionRepository.findByIdWithCredentials(accA._id))!;
    expect(after.active).toBe(true);
    expect(readCredentials(after).accessToken).toBe('TOKEN-OF-A');
    expect(await ContentItem.countDocuments({ userId: toObjectId(a.id) })).toBe(6);
    expect(await ContentItem.countDocuments({ userId: toObjectId(b.id) })).toBe(0);
  });

  it('enforces one winner during concurrent claims and permits transfer only after disconnect', async () => {
    const a = await registerUser('race-a@test.example');
    const b = await registerUser('race-b@test.example');
    const attempts = await Promise.all([connect(a, 'A'), connect(b, 'B')]);
    expect(attempts.map((r) => r.status).sort()).toEqual([202, 409]);
    const winner = attempts[0].status === 202 ? a : b;
    const next = winner.id === a.id ? b : a;
    expect(await ConnectedAccount.countDocuments({ active: true })).toBe(1);
    expect((await api().post('/api/v1/connections/instagram/disconnect').set(winner.auth)).status).toBe(200);
    expect((await connect(next, 'NEXT')).status).toBe(202);
    expect(await ConnectedAccount.countDocuments({ active: true, userId: next.id })).toBe(1);
  });

  it('adds the unique constraint alongside the previous non-unique lookup index without dropping data', async () => {
    await ConnectedAccount.collection.createIndex({ platform: 1, providerAccountId: 1 }, { name: 'platform_1_providerAccountId_1', partialFilterExpression: { active: true } });
    await ConnectedAccount.createIndexes();
    const indexes = await ConnectedAccount.collection.indexes();
    expect(indexes.find((index) => index.name === 'one_live_provider_owner')?.unique).toBe(true);
  });
});
