/** Manual migration: dry run by default; --apply requires separate environment-owner approval. */
import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { reencryptSecrets } from './lib/reencrypt.js';

async function main() {
  const apply = process.argv.includes('--apply');
  if (process.argv.slice(2).some((arg) => arg !== '--apply')) throw new Error('Unknown migration option');
  if (config.crypto.previousCredentialKey?.equals(config.crypto.credentialKey)) throw new Error('Rotation keys must differ');
  if (!config.crypto.previousCredentialKey) console.log('No previous key configured; values unreadable with the current key will block migration.');
  // Use the raw driver: importing the app's model connection could auto-create collections/indexes
  // even during a dry run. This client performs no model initialization or schema writes.
  const client = new mongoose.mongo.MongoClient(config.database.mongoUri, { serverSelectionTimeoutMS: 10_000, maxPoolSize: 2 });
  try {
    await client.connect();
    const result = await reencryptSecrets(client.db(), apply);
    console.log(JSON.stringify(result)); // Only field names, counts and status. Never values or identifiers.
    console.log(apply ? (result.blocked ? 'Migration blocked or incomplete. Keep both keys and investigate.' : 'Migration verified. Check all writers and backups before retiring the previous key.') : 'Dry run only. No values written.');
    if (result.blocked) process.exitCode = 2;
  } finally {
    await client.close();
  }
}

main().catch(() => {
  console.error('Re-encryption failed. Keep both keys, inspect configuration and rerun the dry-run preflight. No raw error is logged.');
  process.exitCode = 1;
});
