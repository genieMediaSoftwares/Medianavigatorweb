import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/db/client.js';
import { config } from '../src/config/env.js';
import { decryptSecret, encryptSecret, encryptedWithCurrentKey } from '../src/lib/crypto.js';
import { ENCRYPTED_FIELDS, reencryptSecrets } from '../scripts/lib/reencrypt.js';
import { api, registerUser } from './helpers.js';
import { Session } from '../src/models/Session.js';
import { spawnSync } from 'node:child_process';

const keys = config.crypto as { credentialKey: Buffer; previousCredentialKey: Buffer | null };
const original = { current: keys.credentialKey, previous: keys.previousCredentialKey };
const signing = config.auth as { jwtSecret: string };
const originalSigning = signing.jwtSecret;
let database: MongoMemoryServer;
const db = () => mongoose.connection.db!;

beforeAll(async () => {
  // Never use TEST_MONGODB_URI or the application's configured database for rotation drills.
  database = await MongoMemoryServer.create();
  await connectDatabase(database.getUri('rotation_disposable_only'));
});
afterAll(async () => { await disconnectDatabase(); await database.stop(); });
beforeEach(async () => {
  keys.credentialKey = original.current;
  keys.previousCredentialKey = original.previous;
  signing.jwtSecret = originalSigning;
  for (const c of await db().collections()) await c.deleteMany({});
});
afterEach(() => {
  vi.restoreAllMocks();
  keys.credentialKey = original.current;
  keys.previousCredentialKey = original.previous;
  signing.jwtSecret = originalSigning;
});

async function seed() {
  for (const { collection, field } of ENCRYPTED_FIELDS) {
    await db().collection(collection).insertOne(field.includes('.')
      ? { email: `synthetic-${field.split('.')[1]}@test.example`, mfa: { [field.split('.')[1]]: encryptSecret('synthetic-value') } }
      : { [field]: encryptSecret('synthetic-value') });
  }
  keys.previousCredentialKey = original.current;
  keys.credentialKey = Buffer.alloc(32, 21);
}
const moved = (result: Awaited<ReturnType<typeof reencryptSecrets>>) => result.after.reduce((n, r) => n + r.toMove, 0);

describe('safe encryption migration', () => {
  it('runs the real CLI dry run without creating collections, then applies only with the explicit flag', async () => {
    const cliDb = mongoose.connection.getClient().db('rotation_cli_disposable');
    const originalCiphertext = encryptSecret('cli-synthetic-credential');
    await cliDb.collection('connectedaccounts').insertOne({ credentialsEnc: originalCiphertext });
    const run = (args: string[]) => spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/reencrypt-secrets.ts', ...args], {
      cwd: process.cwd(), encoding: 'utf8', timeout: 20_000,
      env: { ...process.env, MONGODB_URI: database.getUri('rotation_cli_disposable'), CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 21).toString('base64'), CREDENTIAL_ENCRYPTION_KEY_PREVIOUS: original.current.toString('base64') },
    });
    const dryRun = run([]);
    expect(dryRun.status).toBe(0);
    expect(JSON.parse(dryRun.stdout.split('\n').find((line) => line.startsWith('{'))!)).toMatchObject({ applied: false, writes: { moved: 0 } });
    expect((await cliDb.collection('connectedaccounts').findOne({}))!.credentialsEnc).toBe(originalCiphertext);
    expect((await cliDb.listCollections().toArray()).map((row) => row.name)).toEqual(['connectedaccounts']);
    const applied = run(['--apply']);
    expect(applied.status).toBe(0);
    expect(JSON.parse(applied.stdout.split('\n').find((line) => line.startsWith('{'))!)).toMatchObject({ applied: true, readyToRemovePrevious: true, writes: { moved: 1 } });
    expect(applied.stdout + applied.stderr).not.toContain('cli-synthetic-credential');
    expect((await cliDb.listCollections().toArray()).map((row) => row.name)).toEqual(['connectedaccounts']);
  });

  it('rejects trailing envelope fields, noncanonical encoding and truncated authentication tags', () => {
    const valid = encryptSecret('synthetic-envelope-value');
    const shortTag = valid.split('.');
    shortTag[2] = Buffer.from(shortTag[2], 'base64url').subarray(0, 4).toString('base64url');
    for (const invalid of [`${valid}.extra`, valid.replace(/\./, '.='), shortTag.join('.')]) {
      expect(encryptedWithCurrentKey(invalid)).toBe(false);
      expect(() => decryptSecret(invalid)).toThrow('Unsupported ciphertext format');
    }
    expect(decryptSecret(valid)).toBe('synthetic-envelope-value');
  });
  it('dry run counts every encrypted field without writes or disclosure', async () => {
    await seed();
    const before = await db().collection('connectedaccounts').findOne({});
    const result = await reencryptSecrets(db());
    expect(result.applied).toBe(false);
    expect(result.readyToRemovePrevious).toBe(false);
    expect(moved(result)).toBe(4);
    expect(await db().collection('connectedaccounts').findOne({})).toEqual(before);
    expect(JSON.stringify(result)).not.toMatch(/synthetic-value|v1\.|_id/);
  });

  it('preserves provider, PKCE and both MFA values after removal of the previous key', async () => {
    await seed();
    const result = await reencryptSecrets(db(), true);
    expect(result).toMatchObject({ blocked: false, readyToRemovePrevious: true, writes: { moved: 4 } });
    keys.previousCredentialKey = null;
    for (const { collection, field } of ENCRYPTED_FIELDS) {
      const doc = await db().collection(collection).findOne({ [field]: { $exists: true } });
      const value = field.split('.').reduce<any>((v, key) => v[key], doc);
      expect(decryptSecret(value)).toBe('synthetic-value');
    }
    expect((await reencryptSecrets(db(), true)).writes.moved).toBe(0);
  });

  it('blocks ALL writes when a later collection has an unsupported, empty or non-string value', async () => {
    await seed();
    const before = await db().collection('connectedaccounts').findOne({});
    for (const value of ['v2.unsupported', '', 42]) {
      await db().collection('users').updateOne({ 'mfa.pendingSecretEnc': { $exists: true } }, { $set: { 'mfa.pendingSecretEnc': value } });
      const result = await reencryptSecrets(db(), true);
      expect(result).toMatchObject({ applied: false, blocked: true, readyToRemovePrevious: false, writes: { moved: 0 } });
      expect(await db().collection('connectedaccounts').findOne({})).toEqual(before);
    }
  });

  it('blocks with a wrong previous key without changing stored credentials', async () => {
    await seed();
    keys.previousCredentialKey = Buffer.alloc(32, 22);
    const result = await reencryptSecrets(db(), true);
    expect(result).toMatchObject({ applied: false, blocked: true, writes: { moved: 0 } });
    expect(result.before.reduce((n, r) => n + r.unreadable, 0)).toBe(4);
  });

  it('does not overwrite a concurrently refreshed credential and verifies it after the skipped write', async () => {
    await seed();
    const collection = db().collection('connectedaccounts');
    const originalCollection = db().collection.bind(db());
    vi.spyOn(db(), 'collection').mockImplementation(((name: string, options: any) => name === 'connectedaccounts' ? collection : originalCollection(name, options)) as any);
    const update = collection.updateOne.bind(collection);
    const refreshed = encryptSecret('newer-synthetic-value');
    vi.spyOn(collection, 'updateOne').mockImplementationOnce((async (filter: any, changes: any) => {
      await update({ _id: filter._id }, { $set: { credentialsEnc: refreshed } });
      return update(filter, changes);
    }) as any);
    const result = await reencryptSecrets(db(), true);
    expect(result).toMatchObject({ blocked: false, readyToRemovePrevious: true, writes: { moved: 3, skippedChanged: 1 } });
    expect((await collection.findOne({}))!.credentialsEnc).toBe(refreshed);
  });

  it('keeps partially migrated values readable and safely resumes after a write failure', async () => {
    await seed();
    const collection = db().collection('oauthstates');
    const originalCollection = db().collection.bind(db());
    vi.spyOn(db(), 'collection').mockImplementation(((name: string, options: any) => name === 'oauthstates' ? collection : originalCollection(name, options)) as any);
    vi.spyOn(collection, 'updateOne').mockRejectedValueOnce(new Error('synthetic database interruption'));
    await expect(reencryptSecrets(db(), true)).rejects.toThrow('synthetic database interruption');
    const result = await reencryptSecrets(db(), true);
    expect(result).toMatchObject({ blocked: false, readyToRemovePrevious: true, writes: { moved: 3 } });
  });
});

it('JWT replacement alone permits refresh, but session revocation forces re-login without touching social ciphertext', async () => {
  const user = await registerUser('rotation-session@test.example');
  const encrypted = encryptSecret('preserved-social-credential');
  await db().collection('connectedaccounts').insertOne({ credentialsEnc: encrypted });
  signing.jwtSecret = 'different-test-signing-key-for-rotation-only';
  expect((await api().get('/api/v1/auth/me').set(user.auth)).status).toBe(401);
  const refresh = await api().post('/api/v1/auth/refresh').send({ refreshToken: user.refreshToken });
  expect(refresh.status).toBe(200);
  await Session.updateMany({ revokedAt: null }, { $set: { revokedAt: new Date(), revokedReason: 'test_security_rotation' } });
  expect((await api().get('/api/v1/auth/me').set('Authorization', `Bearer ${refresh.body.data.tokens.accessToken}`)).status).toBe(401);
  expect((await api().post('/api/v1/auth/refresh').send({ refreshToken: refresh.body.data.tokens.refreshToken })).status).toBe(401);
  expect(decryptSecret((await db().collection('connectedaccounts').findOne({}))!.credentialsEnc)).toBe('preserved-social-credential');
});
