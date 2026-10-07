import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { allModels } from '../models/index.js';

mongoose.set('strictQuery', true);
// NoSQL-injection defence lives at the edge: strict zod schemas (no objects where strings are expected) and the
// sanitizeInput middleware. Repositories only ever receive validated, typed values. (mongoose's global sanitizeFilter is
// deliberately off: it would also escape the operators our own server-built queries use.)

export async function connectDatabase(uri: string = config.database.mongoUri): Promise<void> {
  mongoose.connection.on('disconnected', () => logger.warn('mongodb disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('mongodb reconnected'));
  mongoose.connection.on('error', (err) => logger.error('mongodb error', { error: err }));
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 20,
  });
  logger.info('mongodb connected');
}

/** Creates declared indexes. Safe to run on every startup; it never drops data or collections. */
export async function ensureIndexes(): Promise<void> {
  for (const m of allModels) await m.createIndexes();
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export type DatabaseHealth = 'connected' | 'connecting' | 'disconnected';

export async function databaseHealth(): Promise<DatabaseHealth> {
  const state = mongoose.connection.readyState; // 0 disc, 1 conn, 2 connecting, 3 disconnecting
  if (state === 2) return 'connecting';
  if (state !== 1) return 'disconnected';
  try {
    await mongoose.connection.db!.admin().ping();
    return 'connected';
  } catch {
    return 'disconnected';
  }
}
