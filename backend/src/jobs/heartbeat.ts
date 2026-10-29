import { randomUUID } from 'node:crypto';
import { WorkerHeartbeat } from '../models/WorkerHeartbeat.js';
const instance = randomUUID();
const THROTTLE_MS = 30_000;
const lastWritten = new Map<string, number>();

/** Written only after a successful worker iteration, never merely because the process started. At most every 30s per task. */
export async function recordHeartbeat(task: string) {
  const now = Date.now();
  if (now - (lastWritten.get(task) ?? 0) < THROTTLE_MS) return;
  await WorkerHeartbeat.updateOne({ instance, task }, { $set: { lastSucceededAt: new Date(now) } }, { upsert: true });
  lastWritten.set(task, now);
}
