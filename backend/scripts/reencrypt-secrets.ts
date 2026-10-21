/**
 * Moves every encrypted value to the current CREDENTIAL_ENCRYPTION_KEY during a key rotation. Run manually, after the
 * new key is set as CREDENTIAL_ENCRYPTION_KEY and the old one as CREDENTIAL_ENCRYPTION_KEY_PREVIOUS:
 *
 *   npx tsx scripts/reencrypt-secrets.ts            # dry run: counts only, writes nothing
 *   npx tsx scripts/reencrypt-secrets.ts --apply    # re-encrypts
 *
 * Each write is conditional on the old ciphertext still being stored, so a value the sync worker refreshed meanwhile is
 * left alone (it was already written with the current key). Prints counts only; never prints a value.
 */
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/db/client.js';
import { config } from '../src/config/env.js';
import { decryptSecret, encryptSecret, encryptedWithCurrentKey } from '../src/lib/crypto.js';

const TARGETS = [
  { collection: 'connectedaccounts', field: 'credentialsEnc' },
  { collection: 'oauthstates', field: 'codeVerifierEnc' },
  { collection: 'users', field: 'mfa.secretEnc' },
  { collection: 'users', field: 'mfa.pendingSecretEnc' },
] as const;

const get = (doc: Record<string, any>, path: string) => path.split('.').reduce<any>((v, k) => v?.[k], doc);

async function main() {
  const apply = process.argv.includes('--apply');
  if (!config.crypto.previousCredentialKey) console.log('Note: CREDENTIAL_ENCRYPTION_KEY_PREVIOUS is not set; values not readable with the current key will be reported as unreadable.');
  await connectDatabase();
  const db = mongoose.connection.db!;
  let failures = 0;
  for (const { collection, field } of TARGETS) {
    const counts = { current: 0, toMove: 0, moved: 0, skippedChanged: 0, unreadable: 0 };
    const cursor = db.collection(collection).find({ [field]: { $type: 'string', $regex: '^v1\\.' } }, { projection: { [field]: 1 } });
    for await (const doc of cursor) {
      const value = get(doc, field) as string;
      if (encryptedWithCurrentKey(value)) { counts.current++; continue; }
      let plain: string;
      try { plain = decryptSecret(value); } catch { counts.unreadable++; continue; }
      counts.toMove++;
      if (!apply) continue;
      const res = await db.collection(collection).updateOne({ _id: doc._id, [field]: value }, { $set: { [field]: encryptSecret(plain) } });
      if (res.modifiedCount === 1) counts.moved++; else counts.skippedChanged++;
    }
    failures += counts.unreadable;
    console.log(`${collection}.${field}: ${JSON.stringify(counts)}`);
  }
  await disconnectDatabase();
  console.log(apply ? 'Re-encryption finished.' : 'Dry run only. Re-run with --apply to write.');
  if (failures) { console.log(`${failures} value(s) could not be decrypted with either key. Do not remove the previous key.`); process.exit(2); }
}

main().catch((err) => { console.error(err instanceof Error ? err.message : 'Re-encryption failed'); process.exit(1); });
