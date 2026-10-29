/** Disposable loopback-only acceptance server. Never connects to configured customer data. */
import '../tests/setup.js';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Empty optional values prevent dotenv from loading real provider credentials into this process.
for (const name of ['GEMINI_API_KEY', 'GEMINI_MODEL', 'FIRECRAWL_API_KEY', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_ENDPOINT', 'R2_PUBLIC_BASE_URL', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'RESEND_API_KEY', 'EMAIL_FROM']) process.env[name] = '';
process.env.CORS_ALLOWED_ORIGINS = 'http://127.0.0.1:3100,http://127.0.0.1:3101';
process.env.DEEP_ANALYSIS_WORKER_ENABLED = 'false';
process.env.ACCOUNT_CLEANUP_WORKER_ENABLED = 'false';

const { connectDatabase, disconnectDatabase, ensureIndexes } = await import('../src/db/client.js');
const { createApp } = await import('../src/app.js');
const { startJobs } = await import('../src/jobs/index.js');
const { WorkerHeartbeat } = await import('../src/models/WorkerHeartbeat.js');
const { registerUser } = await import('../tests/helpers.js');
const { userRepository } = await import('../src/repositories/user.repository.js');
const { Profile } = await import('../src/models/Profile.js');

const database = await MongoMemoryServer.create();
await connectDatabase(database.getUri('acceptance_disposable_only'));
await ensureIndexes();
const user = await registerUser('acceptance-user@test.example');
const admin = await registerUser('acceptance-admin@test.example');
await userRepository.setRole(admin.id, 'super_admin');
await Profile.updateMany({}, { $set: { onboardingCompleted: true } });
const server = createServer(createApp());
const compiled = process.argv.includes('--compiled');
const environment = { ...process.env, MONGODB_URI: database.getUri('acceptance_disposable_only'), SERVER_PORT: '3997' };
const children = compiled ? ['dist/server.mjs', 'dist/worker.mjs'].map((entry) => spawn(process.execPath, [entry], { env: environment, stdio: 'ignore' })) : [];
if (!compiled) { server.listen(3997, '127.0.0.1'); await once(server, 'listening'); }
const stop = compiled ? () => children.forEach((child) => child.kill('SIGTERM')) : startJobs({ dedicated: true });
const expected = ['social_sync', 'sync_scheduler', 'planner_reminders', 'deep_analysis', 'account_cleanup'];
for (let attempt = 0; attempt < 100; attempt++) {
  const tasks = await WorkerHeartbeat.distinct('task');
  const healthy = await fetch('http://127.0.0.1:3997/health').then((response) => response.ok, () => false);
  if (healthy && expected.every((task) => tasks.includes(task))) break;
  if (attempt === 99) throw new Error('Disposable worker heartbeat check failed');
  await new Promise((resolve) => setTimeout(resolve, 100));
}
console.log(JSON.stringify({ ready: true, compiledEntrypoints: compiled, origin: 'http://127.0.0.1:3997', syntheticUsers: 2, workerTasks: expected }));
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  stop(); server.closeAllConnections();
  if (server.listening) await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectDatabase(); await database.stop();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
