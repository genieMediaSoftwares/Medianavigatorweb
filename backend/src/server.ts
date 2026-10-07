import http from 'node:http';
import { config } from './config/env.js';
import { logger } from './lib/logger.js';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase, ensureIndexes } from './db/client.js';
import { startJobs } from './jobs/index.js';

async function main() {
  await connectDatabase();
  await ensureIndexes();

  const server = http.createServer(createApp());
  const stopJobs = startJobs();
  server.listen(config.server.port, () => logger.info('server listening', { port: config.server.port, environment: config.server.nodeEnv }));

  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    logger.info('shutting down', { signal });
    const force = setTimeout(() => { logger.error('forced exit after shutdown timeout'); process.exit(1); }, 15_000);
    force.unref();
    stopJobs();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDatabase();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('startup failed', { error: err });
  process.exit(1);
});
