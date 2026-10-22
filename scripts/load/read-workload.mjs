/** Read-only staging load probe. Never registers users, starts syncs or calls paid AI. Node 22+. */
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
const args = Object.fromEntries(process.argv.slice(2).map(arg => { const i = arg.indexOf('='); return i < 0 ? [arg, 'true'] : [arg.slice(0, i), arg.slice(i + 1)]; }));
const base = new URL(args['--url'] || 'http://127.0.0.1:8080');
const local = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
if (base.username || base.password || base.search || base.hash) throw new Error('Use an origin without credentials, query or fragment.');
if (!local && (base.protocol !== 'https:' || args['--staging-confirmed'] !== 'true')) throw new Error('Remote targets require HTTPS and --staging-confirmed. Never run against production.');
if (['medianavigator.in', 'www.medianavigator.in', 'medianavigator-api.onrender.com', 'medianavigatorweb.vercel.app'].includes(base.hostname)) throw new Error('Known production hosts are blocked. Use isolated staging.');
const number = (key, fallback, max) => { const value = Number(args[key] || fallback); if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new Error(`Invalid ${key}`); return value; };
const rps = number('--rps', 10, 1000), seconds = number('--seconds', 60, 3600), concurrency = number('--concurrency', 20, 1000);
const paths = ['/users/me', '/connections', '/media?limit=24', '/intelligence/overview'];
if (args['--dry-run']) { console.log(JSON.stringify({ origin: base.origin, rps, seconds, concurrency, paths, requests: rps * seconds, note: 'Validation only; no traffic sent.' }, null, 2)); process.exit(0); }
if (!args['--tokens-file']) throw new Error('Supply --tokens-file=/secure/path.json: a JSON array of staging-only access tokens.');
const tokens = JSON.parse(await readFile(args['--tokens-file'], 'utf8'));
if (!Array.isArray(tokens) || tokens.length === 0 || tokens.some(t => typeof t !== 'string' || !t)) throw new Error('Invalid token fixture.');
const latencies = [], statusCounts = {}, active = new Set();
let dropped = 0, failed = 0, sent = 0;
const started = performance.now();
async function request(index) {
  const before = performance.now();
  try {
    const response = await fetch(`${base.origin}/api/v1${paths[index % paths.length]}`, { headers: { Authorization: `Bearer ${tokens[index % tokens.length]}` }, signal: AbortSignal.timeout(15000), redirect: 'error' });
    statusCounts[response.status] = (statusCounts[response.status] || 0) + 1;
    const body = await response.json();
    if (!response.ok || body.success !== true) failed++;
  } catch { failed++; statusCounts.network = (statusCounts.network || 0) + 1; }
  finally { latencies.push(performance.now() - before); }
}
for (let index = 0; index < rps * seconds; index++) {
  const wait = started + index * 1000 / rps - performance.now();
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
  if (active.size >= concurrency) { dropped++; continue; }
  const pending = request(index); sent++; active.add(pending); void pending.finally(() => active.delete(pending));
}
await Promise.all(active); latencies.sort((a, b) => a - b);
const percentile = p => Math.round(latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))] || 0);
const failedFraction = (failed + dropped) / (rps * seconds);
const report = { sent, dropped, failed, statusCounts, durationSeconds: (performance.now() - started) / 1000, p50Ms: percentile(.5), p95Ms: percentile(.95), p99Ms: percentile(.99), failedFraction, uniqueUsers: tokens.length };
console.log(JSON.stringify(report, null, 2));
process.exitCode = failedFraction > .01 || report.p95Ms > 1000 || report.p99Ms > 2500 ? 1 : 0;
