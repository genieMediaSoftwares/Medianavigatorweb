import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { api, clearDb, registerAdmin, registerUser, startTestDb, stopTestDb } from './helpers.js';
import { ConnectedAccount } from '../src/models/ConnectedAccount.js';
import { SyncRun } from '../src/models/SyncRun.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { User } from '../src/models/User.js';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearDb);

describe('central customer administration', () => {
  it('authorizes detail reads, projects safe data and audits the actor and target', async () => {
    const customer = await registerUser('customer@test.example');
    const admin = await registerAdmin();
    await User.updateOne({ _id: customer.id }, { $set: { lockedUntil: new Date(Date.now() + 60000), failedLoginCount: 2 } });
    expect((await api().get(`/api/v1/admin/users/${customer.id}`)).status).toBe(401);
    expect((await api().get(`/api/v1/admin/users/${customer.id}`).set(customer.auth)).status).toBe(403);
    const res = await api().get(`/api/v1/admin/users/${customer.id}`).set(admin.auth).set('x-request-id', 'customer-detail-test');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ user: { id: customer.id }, profile: { fullName: 'Test User' }, activeSessions: 1, failedLoginCount: 2 });
    expect(res.body.data.lockedUntil).toBeTruthy();
    expect(res.body.data.profile).not.toHaveProperty('_id');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|credentialsEnc|accessToken|refreshToken/);
    const audit = await AuditLog.findOne({ action: 'admin.view_user', targetId: customer.id }).lean();
    expect(String(audit?.actorId)).toBe(admin.id);
    expect(audit?.requestId).toBe('customer-detail-test');
    await User.updateOne({ _id: customer.id }, { $set: { deletedAt: new Date() } });
    expect((await api().get(`/api/v1/admin/users/${customer.id}`).set(admin.auth)).status).toBe(404);
    expect((await api().get('/api/v1/admin/users/not-an-id').set(admin.auth)).status).toBe(422);
  });

  it('resolves owners and requesters with status filters while excluding credentials and leases', async () => {
    const customer = await registerUser('owner@test.example');
    const admin = await registerAdmin();
    const account = await ConnectedAccount.create({ userId: customer.id, platform: 'instagram', providerAccountId: 'provider-account', handle: 'owner', status: 'connection_expired', credentialsEnc: 'private-ciphertext', authMethod: 'oauth', missingPermissions: ['insights'] });
    const run = await SyncRun.create({ userId: customer.id, connectedAccountId: account._id, platform: 'instagram', type: 'manual', status: 'failed', requestedBy: admin.id, queuedAt: new Date(), leaseOwner: 'private-worker' });
    const connections = await api().get('/api/v1/admin/connections?status=connection_expired&platform=instagram').set(admin.auth);
    expect(connections.body.data).toHaveLength(1);
    expect(connections.body.data[0]).toMatchObject({ userId: customer.id, ownerEmail: customer.email, authMethod: 'oauth', missingPermissions: ['insights'] });
    const runs = await api().get('/api/v1/admin/sync-runs?status=failed').set(admin.auth);
    expect(runs.body.data).toHaveLength(1);
    expect(runs.body.data[0]).toMatchObject({ id: String(run._id), userId: customer.id, ownerEmail: customer.email, requestedBy: admin.id, requestedByEmail: admin.email });
    for (const body of [connections.body, runs.body]) expect(JSON.stringify(body)).not.toMatch(/private-ciphertext|private-worker|credentialsEnc|leaseOwner|passwordHash/);
    expect((await api().get('/api/v1/admin/connections?status=sync_complete').set(admin.auth)).body.data).toEqual([]);
    expect((await api().get('/api/v1/admin/sync-runs?status=succeeded').set(admin.auth)).body.data).toEqual([]);
    await User.updateOne({ _id: customer.id }, { $set: { deletedAt: new Date() } });
    expect((await api().get('/api/v1/admin/connections').set(admin.auth)).body.data[0].ownerEmail).toBeNull();
  });
});
