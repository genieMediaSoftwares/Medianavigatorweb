import { config } from '../src/config/env.js';
import { releaseConfigurationChecks } from '../src/services/releaseReadiness.js';
import mongoose from 'mongoose';
import { inspectDatabaseIndexes } from './lib/databasePreflight.js';

async function main() {
  const checks = releaseConfigurationChecks(config);
  for (const check of checks) console.log(`${check.ready ? 'PASS' : 'BLOCKED'} ${check.label}`);
  let duplicates = 0;
  let missingIndexes = 0;
  if (process.argv.includes('--database')) {
    // Explicit, read-only opt-in. Never build/drop indexes or select a winner for existing duplicates.
    const client = new mongoose.mongo.MongoClient(config.database.mongoUri, { serverSelectionTimeoutMS: 10_000 });
    try {
      await client.connect();
      const database = client.db();
      const rows = await database.collection('connectedaccounts').aggregate([
        { $match: { active: true } },
        { $group: { _id: { platform: '$platform', providerAccountId: '$providerAccountId' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }, { $count: 'groups' },
      ]).toArray();
      duplicates = rows[0]?.groups ?? 0;
      console.log(`${duplicates ? 'BLOCKED' : 'PASS'} Single-owner social accounts (${duplicates} duplicate active account groups)`);
      const indexChecks = await inspectDatabaseIndexes(database);
      missingIndexes = indexChecks.reduce((count, check) => count + check.missing, 0);
      console.log(`${missingIndexes ? 'BLOCKED' : 'PASS'} Declared database indexes (${missingIndexes} missing or incompatible)`);
    } finally { await client.close(); }
  } else console.log('NOT CHECKED Existing social-account ownership; use --database for the read-only preflight.');
  console.log('NOT CHECKED Live email delivery, provider approvals, background-worker health, backups, signing, physical devices and store submission.');
  if (checks.some((check) => !check.ready) || duplicates || missingIndexes) process.exitCode = 1;
}
main().catch(() => { console.error('Release preflight could not finish. Check configuration and database connectivity; no credentials are printed.'); process.exitCode = 1; });
