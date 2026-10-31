/** Disposable local benchmark. Does not accept an external target or database. */
import '../tests/setup.js';
import { writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { performance } from 'node:perf_hooks';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase, ensureIndexes } from '../src/db/client.js';
import { User } from '../src/models/User.js';
import { Profile } from '../src/models/Profile.js';
import { Session } from '../src/models/Session.js';
import { signAccessToken } from '../src/lib/jwt.js';

const database = await MongoMemoryServer.create();
const server = createServer(createApp());
try {
  await connectDatabase(database.getUri('audit_synthetic_only'));
  await ensureIndexes();
  const ids = Array.from({ length: 1000 }, () => new mongoose.Types.ObjectId());
  const sessions = ids.map(() => new mongoose.Types.ObjectId());
  await User.insertMany(ids.map((_id, i) => ({ _id, email: `synthetic-${i}@audit.invalid`, passwordHash: '!no-login', role: 'user', status: 'active' })));
  await Profile.insertMany(ids.map((userId) => ({ userId, fullName: 'Synthetic User' })));
  await Session.insertMany(ids.map((userId, i) => ({ _id: sessions[i], userId, refreshTokenHash: `synthetic-${i}`, expiresAt: new Date(Date.now() + 3600_000), lastUsedAt: new Date() })));
  const tokens = ids.map((id, i) => signAccessToken({ sub: String(id), sessionId: String(sessions[i]), role: 'user' }));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing loopback listener');
  const origin = `http://127.0.0.1:${address.port}`;
  const routes = ['/api/v1/auth/me', '/api/v1/connections', '/api/v1/media?limit=20'];
  const results = [];
  await (await fetch(`${origin}${routes[0]}`, { headers: { Authorization: `Bearer ${tokens[0]}` } })).arrayBuffer();
  for (const concurrency of [10, 50, 100, 1000]) {
    const count = concurrency === 1000 ? 1000 : 300;
    let next = 0, failures = 0, timeouts = 0;
    const statuses: Record<string, number> = {};
    const errors: Record<string, number> = {};
    const latencies: number[] = [];
    const cpu = process.cpuUsage();
    const start = performance.now();
    let peakRss = process.memoryUsage().rss;
    const sampler = setInterval(() => { peakRss = Math.max(peakRss, process.memoryUsage().rss); }, 20);
    await Promise.all(Array.from({ length: concurrency }, async () => {
      for (;;) {
        const i = next++;
        if (i >= count) return;
        const started = performance.now();
        try {
          const res = await fetch(`${origin}${routes[i % routes.length]}`, { headers: { Authorization: `Bearer ${tokens[i % tokens.length]}` }, signal: AbortSignal.timeout(30_000) });
          const body = await res.json() as { success?: boolean };
          statuses[res.status] = (statuses[res.status] ?? 0) + 1;
          if (!res.ok || !body.success) failures++;
        } catch (error) {
          failures++;
          const detail = error as Error & { cause?: { code?: string } };
          const kind = `${detail.name}:${detail.cause?.code ?? 'unknown'}`;
          errors[kind] = (errors[kind] ?? 0) + 1;
          if ((error as Error).name === 'TimeoutError') timeouts++;
        } finally { latencies.push(performance.now() - started); }
      }
    }));
    clearInterval(sampler);
    latencies.sort((a, b) => a - b);
    const elapsed = performance.now() - start;
    const cpuUsed = process.cpuUsage(cpu);
    const dbStatus = await mongoose.connection.db!.admin().serverStatus();
    const result = { concurrency, requests: count, elapsedMs: Math.round(elapsed), requestsPerSecond: +(count * 1000 / elapsed).toFixed(1), p50Ms: Math.round(latencies[Math.ceil(count * .5) - 1]), p95Ms: Math.round(latencies[Math.ceil(count * .95) - 1]), failures, timeouts, statuses, errors, apiPeakRssMb: Math.round(peakRss / 1048576), apiCpuMs: Math.round((cpuUsed.user + cpuUsed.system) / 1000), databaseConnections: dbStatus.connections };
    results.push(result);
    console.log(JSON.stringify(result));
  }
  await writeFile('audit-load-2026-10-26.json', JSON.stringify({ scope: 'Local loopback; 1000 synthetic users; empty social accounts; no provider or AI calls; test rate limits; API and MongoDB share developer machine. Not hosted capacity evidence.', node: process.version, poolMax: 20, results }, null, 2));
} finally {
  server.closeAllConnections();
  if (server.listening) await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectDatabase();
  await database.stop();
}
