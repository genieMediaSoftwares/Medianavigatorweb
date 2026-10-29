import { connectDatabase, disconnectDatabase, ensureIndexes } from './db/client.js';
import { startJobs } from './jobs/index.js';
import { logger } from './lib/logger.js';

async function main() {
  await connectDatabase();
  await ensureIndexes();
  const stop = startJobs({ dedicated: true });
  logger.info('dedicated worker started');
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true; stop();
    // Leased jobs recover after shutdown; do not pretend all in-flight AI work drained.
    void disconnectDatabase().finally(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
}
main().catch(() => { logger.error('dedicated worker startup failed'); process.exit(1); });
