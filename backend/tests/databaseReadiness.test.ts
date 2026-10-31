import { afterAll, beforeAll, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { inspectDatabaseIndexes } from '../scripts/lib/databasePreflight.js';
import { startTestDb, stopTestDb } from './helpers.js';
import { encryptSecret, decryptSecret } from '../src/lib/crypto.js';
import { ENCRYPTED_FIELDS } from '../scripts/lib/reencrypt.js';

beforeAll(startTestDb);
afterAll(stopTestDb);

it('verifies all declared indexes and detects a missing security index without recreating it', async () => {
  const db = mongoose.connection.db!;
  expect((await inspectDatabaseIndexes(db)).every(row => row.missing === 0)).toBe(true);
  await db.collection('connectedaccounts').dropIndex('one_live_provider_owner');
  expect((await inspectDatabaseIndexes(db)).find(row => row.collection === 'connectedaccounts')?.missing).toBe(1);
  expect((await db.collection('connectedaccounts').listIndexes().toArray()).some(index => index.name === 'one_live_provider_owner')).toBe(false);
});

it('does not create collections when checking an empty database', async () => {
  const empty = mongoose.connection.getClient().db('empty_preflight_test');
  expect((await inspectDatabaseIndexes(empty)).some(row => row.missing > 0)).toBe(true);
  expect(await empty.listCollections().toArray()).toEqual([]);
});

it('preserves all four encrypted field types through a BSON backup/restore simulation', async () => {
  const restoredServer = await MongoMemoryServer.create();
  const client = new mongoose.mongo.MongoClient(restoredServer.getUri('restored_synthetic_only'));
  try {
    await client.connect();
    for (const [index, { collection, field }] of ENCRYPTED_FIELDS.entries()) {
      const ciphertext = encryptSecret(`synthetic-recovery-${index}`);
      const document = { _id: new mongoose.Types.ObjectId(), ...(field.includes('.')
        ? { mfa: { [field.split('.')[1]]: ciphertext } }
        : { [field]: ciphertext }) };
      const snapshot = mongoose.mongo.BSON.serialize(document);
      const restored = mongoose.mongo.BSON.deserialize(snapshot);
      await client.db().collection(collection).insertOne(restored);
      const read = await client.db().collection(collection).findOne({ _id: document._id });
      const value = field.includes('.') ? read?.mfa[field.split('.')[1]] : read?.[field];
      expect(value).toBe(ciphertext);
      expect(decryptSecret(value), field).toBe(`synthetic-recovery-${index}`);
    }
  } finally { await client.close(); await restoredServer.stop(); }
});
