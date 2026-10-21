import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { api, clearDb, registerAdmin, registerUser, startTestDb, stopTestDb } from './helpers.js';
import { ConnectedAccount } from '../src/models/ConnectedAccount.js';
import { SyncRun } from '../src/models/SyncRun.js';
import { CreditTransaction } from '../src/models/CreditTransaction.js';
import { AuditLog } from '../src/models/AuditLog.js';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearDb);

describe('credit ledger (charging disabled)', () => {
  it('records each admin adjustment with its reason and resulting balance, and only that', async () => {
    const admin = await registerAdmin();
    const customer = await registerUser('ledger@test.example');
    expect((await api().patch(`/api/v1/admin/users/${customer.id}/credits`).set(admin.auth).send({ amount: 25, reason: 'Goodwill after outage' })).status).toBe(200);
    expect((await api().patch(`/api/v1/admin/users/${customer.id}/credits`).set(admin.auth).send({ amount: -10 })).status).toBe(200);
    const ledger = await api().get(`/api/v1/admin/users/${customer.id}/credit-ledger`).set(admin.auth);
    expect(ledger.status).toBe(200);
    expect(ledger.body.data.map((r: any) => [r.delta, r.balanceAfter, r.reason, r.actorEmail])).toEqual([[-10, 65, null, admin.email], [25, 75, 'Goodwill after outage', admin.email]]);
    expect(await CreditTransaction.countDocuments({ kind: { $ne: 'admin_adjustment' } })).toBe(0);
    const audit = await AuditLog.findOne({ action: 'user.credits_adjust', 'meta.amount': 25 }).lean();
    expect(audit?.meta).toMatchObject({ from: 50, to: 75, reason: 'Goodwill after outage' });
  });

  it('never writes a ledger row for a refused adjustment, and forbids self-adjustment and zero amounts', async () => {
    const admin = await registerAdmin();
    const customer = await registerUser('ledger-refused@test.example');
    expect((await api().patch(`/api/v1/admin/users/${customer.id}/credits`).set(admin.auth).send({ amount: -51 })).status).toBe(400);
    expect((await api().patch(`/api/v1/admin/users/${admin.id}/credits`).set(admin.auth).send({ amount: 10 })).status).toBe(400);
    expect((await api().patch(`/api/v1/admin/users/${customer.id}/credits`).set(admin.auth).send({ amount: 0 })).status).toBe(422);
    expect(await CreditTransaction.countDocuments()).toBe(0);
  });

  it('a new customer has an empty ledger rather than an invented history', async () => {
    const admin = await registerAdmin();
    const customer = await registerUser('ledger-empty@test.example');
    expect((await api().get(`/api/v1/admin/users/${customer.id}/credit-ledger`).set(admin.auth)).body.data).toEqual([]);
  });
});

describe('admin connection coverage', () => {
  it('reports the recorded profile, API-accessible and synced counts plus the last attempt, without credentials', async () => {
    const admin = await registerAdmin();
    const customer = await registerUser('coverage@test.example');
    const account = await ConnectedAccount.create({
      userId: customer.id, platform: 'instagram', providerAccountId: 'ig-1', handle: '@resort', status: 'sync_complete', credentialsEnc: 'private-ciphertext', dataPointsCount: 424,
      accountInfo: { id: 'ig-1', mediaCount: 435, accessibleMediaCount: 424, mediaListComplete: true, mediaListCheckedAt: '2026-10-21T06:00:00.000Z', followersCount: 5038, followsCount: 221 },
    });
    await SyncRun.create({ userId: customer.id, connectedAccountId: account._id, platform: 'instagram', type: 'scheduled', status: 'succeeded', queuedAt: new Date('2026-10-21T05:00:00Z') });
    await SyncRun.create({ userId: customer.id, connectedAccountId: account._id, platform: 'instagram', type: 'manual', status: 'partial', errorKind: null, queuedAt: new Date('2026-10-21T06:00:00Z') });
    await ConnectedAccount.create({ userId: admin.id, platform: 'linkedin', providerAccountId: 'li-1', handle: 'Company', status: 'sync_complete', dataPointsCount: 3, accountInfo: { id: 'li-1' } });

    const res = await api().get('/api/v1/admin/connections').set(admin.auth);
    const ig = res.body.data.find((c: any) => c.platform === 'instagram');
    expect(ig.coverage).toEqual({ profileCount: 435, accessibleCount: 424, syncedCount: 424, listingComplete: true, checkedAt: '2026-10-21T06:00:00.000Z', followersCount: 5038, followsCount: 221 });
    expect(ig.lastRun).toMatchObject({ status: 'partial', type: 'manual' });
    // A platform that reports none of these numbers shows them as unknown, not zero.
    const li = res.body.data.find((c: any) => c.platform === 'linkedin');
    expect(li.coverage).toMatchObject({ profileCount: null, accessibleCount: null, listingComplete: null, followersCount: null, syncedCount: 3 });
    expect(JSON.stringify(res.body)).not.toMatch(/private-ciphertext|credentialsEnc/);

    const detail = await api().get(`/api/v1/admin/users/${customer.id}`).set(admin.auth);
    expect(detail.body.data.connections[0]).toMatchObject({ coverage: { accessibleCount: 424 }, lastRun: { status: 'partial' } });
  });

  it('rejects an unknown connection status filter instead of silently returning nothing', async () => {
    const admin = await registerAdmin();
    expect((await api().get('/api/v1/admin/connections?status=bogus').set(admin.auth)).status).toBe(422);
  });
});
