import { config } from '../src/config/env.js';
import { releaseConfigurationChecks } from '../src/services/releaseReadiness.js';
import { connectDatabase, disconnectDatabase } from '../src/db/client.js';
import { ConnectedAccount } from '../src/models/ConnectedAccount.js';

async function main() {
  const checks = releaseConfigurationChecks(config);
  for (const check of checks) console.log(`${check.ready ? 'PASS' : 'BLOCKED'} ${check.label}`);
  let duplicates = 0;
  if (process.argv.includes('--database')) {
    // Explicit, read-only opt-in. Never build/drop indexes or select a winner for existing duplicates.
    await connectDatabase();
    try {
      const rows = await ConnectedAccount.aggregate([
        { $match: { active: true } },
        { $group: { _id: { platform: '$platform', providerAccountId: '$providerAccountId' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }, { $count: 'groups' },
      ]);
      duplicates = rows[0]?.groups ?? 0;
      console.log(`${duplicates ? 'BLOCKED' : 'PASS'} Single-owner social accounts (${duplicates} duplicate active account groups)`);
    } finally { await disconnectDatabase(); }
  } else console.log('NOT CHECKED Existing social-account ownership; use --database for the read-only preflight.');
  console.log('NOT CHECKED Live email delivery, provider approvals, background-worker health, backups, signing, physical devices and store submission.');
  if (checks.some((check) => !check.ready) || duplicates) process.exitCode = 1;
}
main().catch(() => { console.error('Release preflight could not finish. Check configuration and database connectivity; no credentials are printed.'); process.exitCode = 1; });
