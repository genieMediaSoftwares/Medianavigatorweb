import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { api, registerUser, startTestDb, stopTestDb, clearDb } from './helpers.js';
import { ConnectedAccount } from '../src/models/ConnectedAccount.js';
import { InstagramAd } from '../src/models/InstagramAd.js';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearDb);
describe('paid content API', () => {
  it('requires authentication and returns no sample records for new users', async () => {
    expect((await api().get('/api/v1/intelligence/ads')).status).toBe(401);
    const user = await registerUser('new@example.com');
    const res = await api().get('/api/v1/intelligence/ads').set(user.auth);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ connected: false, sync: null, items: [], nextCursor: null, boostedMediaIds: [], nextBoosts: [] });
  });
  it('paginates, filters, isolates owners and hides disconnected or replaced accounts', async () => {
    const user = await registerUser('owner@example.com');
    const other = await registerUser('other@example.com');
    const connection = await ConnectedAccount.create({ userId: user.id, platform: 'instagram', providerAccountId: '123', handle: '@test', status: 'sync_complete', active: true });
    const docs = Array.from({ length: 26 }, (_, i) => ({ userId: user.id, connectedAccountId: connection._id, instagramAccountId: '123', adKey: `act_1:${String(i).padStart(3, '0')}`, record: { id: String(i), category: i === 25 ? 'boosted_post' : 'ad', spend: null } }));
    await InstagramAd.insertMany(docs);
    const page1 = (await api().get('/api/v1/intelligence/ads').set(user.auth)).body.data;
    expect(page1.items).toHaveLength(24);
    const page2 = (await api().get('/api/v1/intelligence/ads').query({ cursor: page1.nextCursor }).set(user.auth)).body.data;
    expect(page2.items).toHaveLength(2);
    expect(page2.nextCursor).toBeNull();
    const boosts = (await api().get('/api/v1/intelligence/ads').query({ category: 'boosted_post' }).set(user.auth)).body.data;
    expect(boosts.items).toHaveLength(1);
    expect((await api().get('/api/v1/intelligence/ads').set(other.auth)).body.data.items).toEqual([]);
    expect((await api().get('/api/v1/intelligence/ads').query({ category: 'injected' }).set(user.auth)).status).toBe(422);
    await ConnectedAccount.updateOne({ _id: connection._id }, { providerAccountId: '456' });
    expect((await api().get('/api/v1/intelligence/ads').set(user.auth)).body.data.items).toEqual([]);
    await ConnectedAccount.updateOne({ _id: connection._id }, { providerAccountId: '123', active: false });
    expect((await api().get('/api/v1/intelligence/ads').set(user.auth)).body.data.connected).toBe(false);
  });
});
