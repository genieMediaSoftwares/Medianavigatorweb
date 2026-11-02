import { connectDatabase, disconnectDatabase, ensureIndexes } from './db/client.js';
import { startJobs } from './jobs/index.js';
import { logger } from './lib/logger.js';

/** Separate always-on worker entry point. Exposes no public HTTP listener. */
async function main() {
  await connectDatabase();
  await ensureIndexes();
  const stop = startJobs({ dedicated: true });
  // Poll timers are unref'ed so HTTP shutdown can drain; a standalone worker needs its own keepalive.
  const keepalive = setInterval(() => undefined, 60_000);
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    const force = setTimeout(() => process.exit(1), 30_000);
    force.unref();
    await stop();
    clearInterval(keepalive);
    await disconnectDatabase();
    clearTimeout(force);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
  logger.info('background worker started');
}
main().catch((error) => { logger.error('worker startup failed', { error }); process.exit(1); });
