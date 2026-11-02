import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { startTestDb, stopTestDb, clearDb, api, registerUser, PASSWORD } from './helpers.js';

// Object storage is a test double: failures are injected per key, nothing leaves the process.
const storage = vi.hoisted(() => ({ objects: new Set<string>(), failing: new Set<string>() }));
vi.mock('../src/lib/storage.js', async () => {
  const crypto = await import('node:crypto');
  return {
    storageEnabled: () => true,
    buildKey: (u: string, p: string, ext: string) => `users/${u}/${p}/${crypto.randomUUID()}${ext}`,
    putObject: async (k: string) => { storage.objects.add(k); },
    deleteObject: async (k: string) => {
      if (storage.failing.has(k)) throw Object.assign(new Error('R2 unavailable'), { status: 503 });
      storage.objects.delete(k);
    },
    presignedDownloadUrl: async (k: string) => `https://r2.test.example/${k}`,
  };
});

import { accountDeletion } from '../src/services/accountDeletion.service.js';
import { AccountDeletion } from '../src/models/AccountDeletion.js';
import { FileModel } from '../src/models/File.js';
import { Profile } from '../src/models/Profile.js';
import { User } from '../src/models/User.js';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => { await clearDb(); storage.objects.clear(); storage.failing.clear(); });

const oid = (id: string) => new mongoose.Types.ObjectId(id);
async function addFile(userId: string, name: string) {
  const key = `users/${userId}/media/${name}`;
  storage.objects.add(key);
  await FileModel.create({ userId: oid(userId), key, originalName: `${name}.png`, mimeType: 'image/png', size: 10, purpose: 'media', checksum: name });
  return key;
}
const makeDue = (userId: string) => AccountDeletion.updateOne({ userId: oid(userId) }, { $set: { nextAttemptAt: new Date(0) } });

describe('durable account deletion', () => {
  it('removes personal data even when storage fails, keeps the failed object retryable, and finishes on a later run', async () => {
    const a = await registerUser('del-durable@test.example');
    const ok = await addFile(a.id, 'ok');
    const stuck = await addFile(a.id, 'stuck');
    storage.failing.add(stuck);

    const res = await api().delete('/api/v1/users/me').set(a.auth).send({ password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ deleted: true, cleanupPending: true });

    // Access is gone and personal data is removed despite the storage failure.
    expect((await api().get('/api/v1/auth/me').set(a.auth)).status).toBe(401);
    expect((await api().post('/api/v1/auth/refresh').send({ refreshToken: a.refreshToken })).status).toBe(401);
    expect(await Profile.countDocuments({ userId: oid(a.id) })).toBe(0);
    expect(storage.objects.has(ok)).toBe(false);
    // The failed object's record survives as the retry marker, with its file name scrubbed.
    const left = await FileModel.find({ userId: oid(a.id) }).lean();
    expect(left.map((f) => f.key)).toEqual([stuck]);
    expect(left[0].originalName).toBe('deleted');
    const pending = await AccountDeletion.findOne({ userId: oid(a.id) }).lean();
    expect(pending).toMatchObject({ status: 'queued', attempts: 1, leaseOwner: null });
    expect(pending!.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    expect(JSON.stringify(pending)).not.toContain(stuck);

    // Not due yet: a worker tick does nothing.
    expect(await accountDeletion.runOne()).toBe(false);

    // A worker started after a restart only has the database; it picks the intent up and completes it.
    storage.failing.clear();
    await makeDue(a.id);
    expect(await accountDeletion.runOne()).toBe(true);
    expect(storage.objects.has(stuck)).toBe(false);
    expect(await FileModel.countDocuments({ userId: oid(a.id) })).toBe(0);
    expect(await AccountDeletion.findOne({ userId: oid(a.id) }).lean()).toMatchObject({ status: 'complete', attempts: 2, lastError: null });
    const tomb = await User.findById(a.id).lean();
    expect(tomb!.email).toBe(`deleted+${a.id}@deleted.invalid`);
    expect(tomb!.deletedAt).toBeInstanceOf(Date);
  });

  it('recovers a deletion whose worker died mid-run (expired lease)', async () => {
    const a = await registerUser('del-lease@test.example');
    const key = await addFile(a.id, 'f');
    await AccountDeletion.create({ userId: oid(a.id), status: 'processing', attempts: 1, leaseOwner: 'dead-worker', leaseExpiresAt: new Date(Date.now() - 1000) });
    expect(await accountDeletion.runOne()).toBe(true);
    expect(storage.objects.has(key)).toBe(false);
    expect(await AccountDeletion.findOne({ userId: oid(a.id) }).lean()).toMatchObject({ status: 'complete' });
    expect((await api().get('/api/v1/auth/me').set(a.auth)).status).toBe(401);
  });

  it('does not steal a deletion that another live worker holds', async () => {
    const a = await registerUser('del-live@test.example');
    await AccountDeletion.create({ userId: oid(a.id), status: 'processing', attempts: 1, leaseOwner: 'live-worker', leaseExpiresAt: new Date(Date.now() + 60_000) });
    expect(await accountDeletion.runOne()).toBe(false);
    expect(await AccountDeletion.findOne({ userId: oid(a.id) }).lean()).toMatchObject({ leaseOwner: 'live-worker', attempts: 1 });
  });

  it('repeated requests create one intent, and the old password no longer works', async () => {
    const a = await registerUser('del-repeat@test.example');
    await accountDeletion.request(a.id);
    await accountDeletion.request(a.id);
    expect(await AccountDeletion.countDocuments({ userId: oid(a.id) })).toBe(1);
    expect((await api().delete('/api/v1/users/me').set(a.auth).send({ password: PASSWORD })).status).toBe(401);
    expect((await api().post('/api/v1/auth/login').send({ email: 'del-repeat@test.example', password: PASSWORD })).status).toBe(401);
  });

  it('only ever touches the deleted user’s records and objects', async () => {
    const a = await registerUser('del-iso-a@test.example');
    const b = await registerUser('del-iso-b@test.example');
    await addFile(a.id, 'a1');
    const bKey = await addFile(b.id, 'b1');
    storage.failing.add(bKey); // a delete attempt on B's object would surface as a leftover
    const res = await accountDeletion.request(a.id);
    expect(res).toEqual({ deleted: true, cleanupPending: false });
    expect(storage.objects.has(bKey)).toBe(true);
    expect(await FileModel.countDocuments({ userId: oid(b.id) })).toBe(1);
    expect(await Profile.countDocuments({ userId: oid(b.id) })).toBe(1);
    expect((await api().get('/api/v1/auth/me').set(b.auth)).status).toBe(200);
    expect(await AccountDeletion.countDocuments({ userId: oid(b.id) })).toBe(0);
  });
});
