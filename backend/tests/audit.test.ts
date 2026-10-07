import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { startTestDb, stopTestDb, clearDb, api, registerUser, registerAdmin } from './helpers.js';
import { fake, makeMedia } from './fakes.js';

vi.mock('../src/integrations/registry.js', async () => {
  const { fakeAdapter } = await import('./fakes.js');
  const adapters: Record<string, any> = {};
  return { PLATFORMS: ['instagram', 'facebook', 'youtube', 'linkedin'], getAdapter: (p: string) => (adapters[p] ??= fakeAdapter(p as any)) };
});

import { syncService } from '../src/services/sync.service.js';
import { toContentItem } from '../src/integrations/mapper.js';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => { await clearDb(); fake.reset(); fake.items = makeMedia(4, 'instagram'); });

const ctx = () => ({ userId: new mongoose.Types.ObjectId(), connectedAccountId: new mongoose.Types.ObjectId(), capabilities: { unavailableMetrics: [] } as any, syncedAt: new Date() });

describe('audit: data honesty', () => {
  it('drops templated provider "explanations" and never stores a stock thumbnail or an invented date', () => {
    const base = makeMedia(1, 'instagram')[0];
    const doc = toContentItem({ ...base, thumbnailUrl: '', explanation: { observedFact: 'x', possibleReason: 'High-converting caption structure', whatToRepeat: ['visual pacing & hook'] } } as any, ctx())!;
    expect(doc.thumbnailUrl).toBeUndefined();
    expect(JSON.stringify(doc.normalized)).not.toMatch(/High-converting|visual pacing|unsplash/);
    expect(doc.normalized.explanation.whatToRepeat).toEqual([]);
    expect(toContentItem({ ...base, publishedAt: '' } as any, ctx())).toBeNull();
  });
});

describe('audit: admin visibility', () => {
  it('admin connection and sync-run listings never contain credentials', async () => {
    const u = await registerUser('leak@test.example');
    const admin = await registerAdmin();
    await api().post('/api/v1/connections/instagram/connect').set(u.auth).send({ accessToken: 'SUPER-SECRET-TOKEN-XYZ' });
    while (await syncService.runOne('t'));
    for (const path of ['/api/v1/admin/connections', '/api/v1/admin/sync-runs', '/api/v1/admin/audit-logs', '/api/v1/connections']) {
      const res = await api().get(path).set(admin.auth);
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toMatch(/SUPER-SECRET|credentialsEnc|accessToken|refreshToken/);
    }
  });
});

describe('audit: shared rate limit store', () => {
  it('counts hits in MongoDB, per limiter, and resets after the window', async () => {
    const { MongoRateLimitStore } = await import('../src/middleware/mongoRateLimitStore.js');
    const a = new MongoRateLimitStore('a'); const b = new MongoRateLimitStore('b');
    a.init({ windowMs: 150 } as any); b.init({ windowMs: 150 } as any);
    expect((await a.increment('1.2.3.4')).totalHits).toBe(1);
    expect((await a.increment('1.2.3.4')).totalHits).toBe(2);
    expect((await b.increment('1.2.3.4')).totalHits).toBe(1);
    // concurrent increments from several instances never lose a hit
    await Promise.all(Array.from({ length: 10 }, () => a.increment('9.9.9.9')));
    expect((await a.increment('9.9.9.9')).totalHits).toBe(11);
    await new Promise((r) => setTimeout(r, 200));
    expect((await a.increment('1.2.3.4')).totalHits).toBe(1);
  });
});
