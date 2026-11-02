import type { Connection } from 'mongoose';
import { decryptSecret, encryptSecret, encryptedWithCurrentKey } from '../../src/lib/crypto.js';

export const ENCRYPTED_FIELDS = [
  { collection: 'connectedaccounts', field: 'credentialsEnc' },
  { collection: 'oauthstates', field: 'codeVerifierEnc' },
  { collection: 'users', field: 'mfa.secretEnc' },
  { collection: 'users', field: 'mfa.pendingSecretEnc' },
] as const;
type Database = NonNullable<Connection['db']>;
const get = (doc: Record<string, any>, path: string): unknown => path.split('.').reduce<any>((v, k) => v?.[k], doc);
const stored = (field: string) => ({ [field]: { $exists: true, $ne: null } });

/** Include malformed values: skipping them would falsely certify key retirement. */
export async function inspectEncryptedSecrets(db: Database) {
  const rows = [];
  for (const { collection, field } of ENCRYPTED_FIELDS) {
    const counts = { collection, field, current: 0, toMove: 0, unreadable: 0 };
    for await (const doc of db.collection(collection).find(stored(field), { projection: { [field]: 1 } })) {
      const value = get(doc, field);
      if (typeof value !== 'string') { counts.unreadable++; continue; }
      if (encryptedWithCurrentKey(value)) { counts.current++; continue; }
      try { decryptSecret(value); counts.toMove++; } catch { counts.unreadable++; }
    }
    rows.push(counts);
  }
  return rows;
}

/** Returns counts only. Does not connect or write unless explicitly requested. */
export async function reencryptSecrets(db: Database, apply = false) {
  const before = await inspectEncryptedSecrets(db);
  const writes = { moved: 0, skippedChanged: 0 };
  if (!apply || before.some((row) => row.unreadable > 0)) {
    return { applied: false, blocked: before.some((row) => row.unreadable > 0), before, writes, after: before,
      readyToRemovePrevious: before.every((row) => row.toMove === 0 && row.unreadable === 0) };
  }
  for (const { collection, field } of ENCRYPTED_FIELDS) {
    for await (const doc of db.collection(collection).find(stored(field), { projection: { [field]: 1 } })) {
      const value = get(doc, field);
      if (typeof value !== 'string') throw new Error('Encrypted data changed after preflight');
      if (encryptedWithCurrentKey(value)) continue;
      const next = encryptSecret(decryptSecret(value));
      const res = await db.collection(collection).updateOne({ _id: doc._id, [field]: value }, { $set: { [field]: next } });
      if (res.modifiedCount === 1) writes.moved++; else writes.skippedChanged++;
    }
  }
  const after = await inspectEncryptedSecrets(db);
  const readyToRemovePrevious = after.every((row) => row.toMove === 0 && row.unreadable === 0);
  return { applied: true, blocked: !readyToRemovePrevious, before, writes, after, readyToRemovePrevious };
}
