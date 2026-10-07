import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { startTestDb, stopTestDb } from './helpers.js';
import express from 'express';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { buildConfig, ConfigError } from '../src/config/env.js';
import { encryptSecret, decryptSecret } from '../src/lib/crypto.js';
import { redact } from '../src/lib/logger.js';
import { httpFetch } from '../src/lib/http.js';
import { createLimiter } from '../src/middleware/rateLimit.js';

const valid = () => ({ ...(process.env as Record<string, string>) });

describe('configuration', () => {
  it('accepts the complete test environment', () => {
    const c = buildConfig(valid());
    expect(c.server.port).toBe(3999);
    expect(c.auth.accessTtlSeconds).toBe(900);
    expect(c.storage.r2?.bucket).toBe('bucket');
    expect(c.providers.meta?.appId).toBe('meta-app');
  });

  it('has NO silent fallbacks: every required variable is reported when missing', () => {
    expect(() => buildConfig({})).toThrow(ConfigError);
    try { buildConfig({}); } catch (e) {
      const problems = (e as ConfigError).problems.join('\n');
      for (const name of ['NODE_ENV', 'SERVER_PORT', 'MONGODB_URI', 'JWT_SECRET', 'CREDENTIAL_ENCRYPTION_KEY', 'CORS_ALLOWED_ORIGINS', 'PROVIDER_TIMEOUT_MS']) expect(problems).toContain(name);
    }
    const noDb = valid(); delete noDb.MONGODB_URI;
    expect(() => buildConfig(noDb)).toThrow(/MONGODB_URI/);
    const noPort = valid(); delete noPort.SERVER_PORT;
    expect(() => buildConfig(noPort)).toThrow(/SERVER_PORT/);
  });

  it('rejects weak or malformed values', () => {
    expect(() => buildConfig({ ...valid(), JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
    expect(() => buildConfig({ ...valid(), CREDENTIAL_ENCRYPTION_KEY: 'abc' })).toThrow(/CREDENTIAL_ENCRYPTION_KEY/);
    expect(() => buildConfig({ ...valid(), MONGODB_URI: 'http://nope' })).toThrow(/MONGODB_URI/);
    expect(() => buildConfig({ ...valid(), JWT_ACCESS_EXPIRES_IN: '15 minutes' })).toThrow(/JWT_ACCESS_EXPIRES_IN/);
    expect(() => buildConfig({ ...valid(), SYNC_WORKER_ENABLED: 'yes' })).toThrow(/SYNC_WORKER_ENABLED/);
  });

  it('optional groups are all-or-nothing', () => {
    const half = valid(); delete half.R2_SECRET_ACCESS_KEY;
    expect(() => buildConfig(half)).toThrow(/Cloudflare R2 is partially configured; missing: R2_SECRET_ACCESS_KEY/);
    const none = valid(); for (const k of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_ENDPOINT', 'GEMINI_API_KEY', 'GEMINI_MODEL']) delete none[k];
    const c = buildConfig(none);
    expect(c.storage.r2).toBeUndefined();
    expect(c.ai.enabled).toBe(false);
  });

  it('enforces production safety', () => {
    expect(() => buildConfig({ ...valid(), NODE_ENV: 'production', API_BASE_URL: 'http://api.example.com' })).toThrow(/https/);
    expect(() => buildConfig({ ...valid(), NODE_ENV: 'production', CORS_ALLOWED_ORIGINS: '*' })).toThrow(/CORS/);
  });
});

describe('repository hygiene (static checks)', () => {
  const src = path.resolve(__dirname, '../src');
  const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.ts') ? [path.join(d, e.name)] : []));
  const files = walk(src);

  it('only config/env.ts touches process.env', () => {
    const offenders = files.filter((f) => !f.endsWith(path.join('config', 'env.ts')) && /process\.env/.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('has no hardcoded hosts, credentials or demo data in production code', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const t = fs.readFileSync(f, 'utf8').split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
      const code = t.join('\n');
      if (/localhost|127\.0\.0\.1|onrender\.com|mongodb(\+srv)?:\/\/[^'"`\s]*@/.test(code)) offenders.push(`${f}: host`);
      if (/(secret|password|api[_-]?key)\s*[:=]\s*['"][^'"]{6,}['"]/i.test(code)) offenders.push(`${f}: literal secret`);
      if (/seed|fixture|demoMode:\s*true|isDemo:\s*true/i.test(code.replace(/isDemo: undefined/g, ''))) offenders.push(`${f}: seed/fixture/demo`);
    }
    expect(offenders).toEqual([]);
  });

  it('never imports test code and ships no extra env files', () => {
    expect(files.filter((f) => /from ['"].*tests?\//.test(fs.readFileSync(f, 'utf8')))).toEqual([]);
    const backend = path.resolve(__dirname, '..');
    for (const name of ['.env.example', '.env.local', '.env.production', '.env.development', '.env.test', '.dev.vars']) expect(fs.existsSync(path.join(backend, name))).toBe(false);
  });
});

describe('credential encryption', () => {
  it('round-trips, uses a fresh IV, and detects tampering', () => {
    const a = encryptSecret('super-secret-token');
    const b = encryptSecret('super-secret-token');
    expect(a).not.toBe(b);
    expect(a).not.toContain('super-secret-token');
    expect(decryptSecret(a)).toBe('super-secret-token');
    const parts = a.split('.'); parts[3] = Buffer.from('tampered').toString('base64url');
    expect(() => decryptSecret(parts.join('.'))).toThrow();
  });
});

describe('log redaction', () => {
  it('removes secrets by key name and from URLs/messages', () => {
    const out = JSON.stringify(redact({
      password: 'hunter2', accessToken: 'abc', authorization: 'Bearer xyz', nested: { client_secret: 's', ok: 'fine' },
      url: 'https://graph.facebook.com/me?access_token=EAAB123&fields=id', db: 'mongodb+srv://user:pw@cluster.mongodb.net/db', error: new Error('failed with token=abc123'),
    }));
    expect(out).not.toMatch(/hunter2|EAAB123|user:pw|abc123|xyz"/);
    expect(out).toContain('fine');
  });
});

describe('provider HTTP', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('retries transient failures a bounded number of times', async () => {
    const fn = vi.fn().mockResolvedValueOnce(new Response('', { status: 503 })).mockResolvedValueOnce(new Response('', { status: 429 })).mockResolvedValueOnce(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fn);
    expect((await httpFetch('https://x.example/a')).status).toBe(200);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('never retries authentication/permission errors or non-idempotent requests', async () => {
    const fn401 = vi.fn().mockResolvedValue(new Response('', { status: 401 }));
    vi.stubGlobal('fetch', fn401);
    expect((await httpFetch('https://x.example/a')).status).toBe(401);
    expect(fn401).toHaveBeenCalledTimes(1);
    const post = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    vi.stubGlobal('fetch', post);
    await httpFetch('https://x.example/a', { method: 'POST' });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('gives up after the retry budget and times out hung requests', async () => {
    const fn = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    vi.stubGlobal('fetch', fn);
    expect((await httpFetch('https://x.example/a')).status).toBe(503);
    expect(fn).toHaveBeenCalledTimes(3); // 1 + PROVIDER_MAX_RETRIES(2)
    vi.stubGlobal('fetch', (_u: string, init: RequestInit) => new Promise((_, rej) => init.signal!.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })))));
    await expect(httpFetch('https://x.example/slow', { timeoutMs: 30, maxRetries: 0 })).rejects.toThrow(/timed out/);
  });
});

describe('rate limiting', () => {
  beforeAll(startTestDb);
  afterAll(stopTestDb);
  it('returns 429 in the standard envelope once the limit is exceeded', async () => {
    const app = express();
    app.use(createLimiter(2));
    app.get('/x', (_req, res) => res.json({ ok: true }));
    expect((await request(app).get('/x')).status).toBe(200);
    expect((await request(app).get('/x')).status).toBe(200);
    const limited = await request(app).get('/x');
    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({ success: false, error: { code: 'RATE_LIMITED' } });
  });
});
