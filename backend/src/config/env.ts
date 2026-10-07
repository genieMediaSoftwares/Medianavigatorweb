/**
 * The ONLY module allowed to read process.env.
 *
 * Every value comes from backend/.env (or the host's environment on Render, using the same names).
 * There are no silent defaults: a missing or malformed required value aborts startup with a
 * message naming every problem.
 *
 * Optional feature groups (Gemini, R2, SMTP, each OAuth provider) must be either FULLY configured
 * or fully absent. A partially configured group is a startup error. An absent group disables the
 * feature, and the API reports it as unavailable instead of faking it.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const here = path.dirname(fileURLToPath(import.meta.url));
// backend/src/config -> backend/.env. Real environment variables win over the file.
dotenv.config({ path: path.resolve(here, '../../.env'), quiet: true });

const required = (name: string) => z.string({ required_error: `${name} is required` }).trim().min(1, `${name} must not be empty`);
const int = (name: string, min = 0) =>
  required(name).regex(/^-?\d+$/, `${name} must be an integer`).transform(Number).refine((n) => n >= min, `${name} must be >= ${min}`);
const bool = (name: string) =>
  required(name).refine((v) => v === 'true' || v === 'false', `${name} must be "true" or "false"`).transform((v) => v === 'true');
const duration = (name: string) =>
  required(name)
    .regex(/^\d+[smhd]$/, `${name} must look like 30s, 15m, 12h or 30d`)
    .transform((v) => Number(v.slice(0, -1)) * { s: 1, m: 60, h: 3600, d: 86400 }[v.slice(-1) as 's' | 'm' | 'h' | 'd']);
const url = (name: string) => required(name).url(`${name} must be a valid URL`);
const list = (name: string) =>
  required(name).transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean));

const optionalText = z.string().trim().optional().transform((v) => (v === '' ? undefined : v));

const schema = z.object({
  // --- server ---
  NODE_ENV: z.enum(['development', 'test', 'production'], { errorMap: () => ({ message: 'NODE_ENV must be development, test or production' }) }),
  SERVER_PORT: int('SERVER_PORT', 1),
  API_BASE_URL: url('API_BASE_URL'),
  WEB_APP_URL: url('WEB_APP_URL'),
  REQUEST_BODY_LIMIT: required('REQUEST_BODY_LIMIT'),
  CORS_ALLOWED_ORIGINS: list('CORS_ALLOWED_ORIGINS'),
  TRUST_PROXY_HOPS: int('TRUST_PROXY_HOPS', 0),

  // --- database ---
  MONGODB_URI: required('MONGODB_URI').refine((v) => /^mongodb(\+srv)?:\/\//.test(v), 'MONGODB_URI must start with mongodb:// or mongodb+srv://'),
  MONGODB_QUERY_MAX_LIMIT: int('MONGODB_QUERY_MAX_LIMIT', 1),
  ANALYTICS_MAX_ITEMS: int('ANALYTICS_MAX_ITEMS', 1),

  // --- auth ---
  JWT_SECRET: required('JWT_SECRET').min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: duration('JWT_ACCESS_EXPIRES_IN'),
  JWT_REFRESH_EXPIRES_IN: duration('JWT_REFRESH_EXPIRES_IN'),
  PASSWORD_HASH_ROUNDS: int('PASSWORD_HASH_ROUNDS', 10),
  LOGIN_MAX_FAILED_ATTEMPTS: int('LOGIN_MAX_FAILED_ATTEMPTS', 1),
  LOGIN_LOCKOUT_MINUTES: int('LOGIN_LOCKOUT_MINUTES', 1),
  PASSWORD_RESET_TOKEN_TTL_MINUTES: int('PASSWORD_RESET_TOKEN_TTL_MINUTES', 1),
  MAX_SESSIONS_PER_USER: int('MAX_SESSIONS_PER_USER', 1),

  // --- credentials encryption (AES-256-GCM key, base64 of 32 random bytes) ---
  CREDENTIAL_ENCRYPTION_KEY: required('CREDENTIAL_ENCRYPTION_KEY').refine(
    (v) => Buffer.from(v, 'base64').length === 32,
    'CREDENTIAL_ENCRYPTION_KEY must be base64 of exactly 32 bytes (openssl rand -base64 32)',
  ),

  // --- rate limits (requests per window, per client) ---
  RATE_LIMIT_WINDOW_MS: int('RATE_LIMIT_WINDOW_MS', 1000),
  RATE_LIMIT_GENERAL_MAX: int('RATE_LIMIT_GENERAL_MAX', 1),
  RATE_LIMIT_AUTH_MAX: int('RATE_LIMIT_AUTH_MAX', 1),
  RATE_LIMIT_SYNC_MAX: int('RATE_LIMIT_SYNC_MAX', 1),
  RATE_LIMIT_AI_MAX: int('RATE_LIMIT_AI_MAX', 1),
  RATE_LIMIT_UPLOAD_MAX: int('RATE_LIMIT_UPLOAD_MAX', 1),
  RATE_LIMIT_ADMIN_MAX: int('RATE_LIMIT_ADMIN_MAX', 1),

  // --- provider HTTP behaviour ---
  PROVIDER_TIMEOUT_MS: int('PROVIDER_TIMEOUT_MS', 1000),
  PROVIDER_MAX_RETRIES: int('PROVIDER_MAX_RETRIES', 0),
  PROVIDER_RETRY_BASE_MS: int('PROVIDER_RETRY_BASE_MS', 1),
  PROVIDER_MAX_PAGES: int('PROVIDER_MAX_PAGES', 1),
  META_API_VERSION: required('META_API_VERSION').regex(/^v\d+\.\d+$/, 'META_API_VERSION must look like v21.0'),
  YOUTUBE_API_VERSION: required('YOUTUBE_API_VERSION').regex(/^v\d+$/, 'YOUTUBE_API_VERSION must look like v3'),
  LINKEDIN_API_VERSION: required('LINKEDIN_API_VERSION').regex(/^\d{6}$/, 'LINKEDIN_API_VERSION must look like 202401'),
  OAUTH_STATE_TTL_SECONDS: int('OAUTH_STATE_TTL_SECONDS', 30),

  // --- sync engine ---
  SYNC_INTERVAL_MINUTES: int('SYNC_INTERVAL_MINUTES', 1),
  SYNC_TIMEOUT_MS: int('SYNC_TIMEOUT_MS', 1000),
  SYNC_LEASE_SECONDS: int('SYNC_LEASE_SECONDS', 30),
  SYNC_MAX_ATTEMPTS: int('SYNC_MAX_ATTEMPTS', 1),
  SYNC_WORKER_ENABLED: bool('SYNC_WORKER_ENABLED'),
  SYNC_WORKER_POLL_MS: int('SYNC_WORKER_POLL_MS', 100),
  SYNC_SCHEDULER_ENABLED: bool('SYNC_SCHEDULER_ENABLED'),
  JOBS_TRIGGER_SECRET: optionalText,

  // --- AI limits (the Gemini key itself is an optional group, see below) ---
  AI_TIMEOUT_MS: int('AI_TIMEOUT_MS', 1000),
  AI_MAX_INPUT_CHARS: int('AI_MAX_INPUT_CHARS', 100),
  AI_CACHE_TTL_HOURS: int('AI_CACHE_TTL_HOURS', 1),
  GEMINI_API_KEY: optionalText,
  GEMINI_MODEL: optionalText,

  // --- file uploads ---
  FILE_MAX_BYTES: int('FILE_MAX_BYTES', 1),
  FILE_ALLOWED_MIME_TYPES: list('FILE_ALLOWED_MIME_TYPES'),
  FILE_PRESIGNED_URL_TTL_SECONDS: int('FILE_PRESIGNED_URL_TTL_SECONDS', 10),
  R2_ACCOUNT_ID: optionalText,
  R2_ACCESS_KEY_ID: optionalText,
  R2_SECRET_ACCESS_KEY: optionalText,
  R2_BUCKET: optionalText,
  R2_ENDPOINT: optionalText,
  R2_PUBLIC_BASE_URL: optionalText,

  // --- email (password reset delivery); optional group ---
  SMTP_HOST: optionalText,
  SMTP_PORT: optionalText,
  SMTP_USER: optionalText,
  SMTP_PASSWORD: optionalText,
  EMAIL_FROM: optionalText,

  // --- providers; each group is all-or-nothing ---
  META_APP_ID: optionalText,
  META_APP_SECRET: optionalText,
  META_REDIRECT_URI: optionalText,
  YOUTUBE_CLIENT_ID: optionalText,
  YOUTUBE_CLIENT_SECRET: optionalText,
  YOUTUBE_REDIRECT_URI: optionalText,
  LINKEDIN_CLIENT_ID: optionalText,
  LINKEDIN_CLIENT_SECRET: optionalText,
  LINKEDIN_REDIRECT_URI: optionalText,
});

type Raw = z.infer<typeof schema>;

function group<K extends keyof Raw>(raw: Raw, label: string, keys: readonly K[], problems: string[]): { [P in K]: NonNullable<Raw[P]> } | undefined {
  const present = keys.filter((k) => raw[k] !== undefined);
  if (present.length === 0) return undefined;
  if (present.length !== keys.length) {
    const missing = keys.filter((k) => raw[k] === undefined);
    problems.push(`${label} is partially configured; missing: ${missing.join(', ')} (set all of ${keys.join(', ')} or none)`);
    return undefined;
  }
  return Object.fromEntries(keys.map((k) => [k, raw[k]])) as { [P in K]: NonNullable<Raw[P]> };
}

export class ConfigError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid configuration:\n - ${problems.join('\n - ')}`);
    this.name = 'ConfigError';
  }
}

export function buildConfig(source: Record<string, string | undefined>) {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    throw new ConfigError(parsed.error.issues.map((i) => i.message));
  }
  const raw = parsed.data;
  const problems: string[] = [];

  const gemini = group(raw, 'Gemini', ['GEMINI_API_KEY', 'GEMINI_MODEL'], problems);
  const r2 = group(raw, 'Cloudflare R2', ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_ENDPOINT'], problems);
  const smtp = group(raw, 'SMTP', ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'EMAIL_FROM'], problems);
  const meta = group(raw, 'Meta (Instagram/Facebook)', ['META_APP_ID', 'META_APP_SECRET', 'META_REDIRECT_URI'], problems);
  const youtube = group(raw, 'YouTube', ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REDIRECT_URI'], problems);
  const linkedin = group(raw, 'LinkedIn', ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET', 'LINKEDIN_REDIRECT_URI'], problems);

  if (smtp && !/^\d+$/.test(smtp.SMTP_PORT)) problems.push('SMTP_PORT must be an integer');
  if (raw.R2_PUBLIC_BASE_URL && !r2) problems.push('R2_PUBLIC_BASE_URL is set but the R2 group is not configured');
  if (raw.NODE_ENV === 'production') {
    if (!raw.API_BASE_URL.startsWith('https://')) problems.push('API_BASE_URL must use https in production');
    if (raw.CORS_ALLOWED_ORIGINS.includes('*')) problems.push('CORS_ALLOWED_ORIGINS must not contain * in production');
  }
  if (problems.length > 0) throw new ConfigError(problems);

  return Object.freeze({
    server: {
      nodeEnv: raw.NODE_ENV,
      isProduction: raw.NODE_ENV === 'production',
      isTest: raw.NODE_ENV === 'test',
      port: raw.SERVER_PORT,
      apiBaseUrl: raw.API_BASE_URL.replace(/\/+$/, ''),
      webAppUrl: raw.WEB_APP_URL.replace(/\/+$/, ''),
      bodyLimit: raw.REQUEST_BODY_LIMIT,
      trustProxyHops: raw.TRUST_PROXY_HOPS,
    },
    cors: { allowedOrigins: raw.CORS_ALLOWED_ORIGINS },
    database: { mongoUri: raw.MONGODB_URI, queryMaxLimit: raw.MONGODB_QUERY_MAX_LIMIT, analyticsMaxItems: raw.ANALYTICS_MAX_ITEMS },
    auth: {
      jwtSecret: raw.JWT_SECRET,
      accessTtlSeconds: raw.JWT_ACCESS_EXPIRES_IN,
      refreshTtlSeconds: raw.JWT_REFRESH_EXPIRES_IN,
      passwordHashRounds: raw.PASSWORD_HASH_ROUNDS,
      maxFailedLogins: raw.LOGIN_MAX_FAILED_ATTEMPTS,
      lockoutMinutes: raw.LOGIN_LOCKOUT_MINUTES,
      resetTokenTtlMinutes: raw.PASSWORD_RESET_TOKEN_TTL_MINUTES,
      maxSessionsPerUser: raw.MAX_SESSIONS_PER_USER,
    },
    crypto: { credentialKey: Buffer.from(raw.CREDENTIAL_ENCRYPTION_KEY, 'base64') },
    rateLimit: {
      windowMs: raw.RATE_LIMIT_WINDOW_MS,
      general: raw.RATE_LIMIT_GENERAL_MAX,
      auth: raw.RATE_LIMIT_AUTH_MAX,
      sync: raw.RATE_LIMIT_SYNC_MAX,
      ai: raw.RATE_LIMIT_AI_MAX,
      upload: raw.RATE_LIMIT_UPLOAD_MAX,
      admin: raw.RATE_LIMIT_ADMIN_MAX,
    },
    providers: {
      timeoutMs: raw.PROVIDER_TIMEOUT_MS,
      maxRetries: raw.PROVIDER_MAX_RETRIES,
      retryBaseMs: raw.PROVIDER_RETRY_BASE_MS,
      maxPages: raw.PROVIDER_MAX_PAGES,
      metaApiVersion: raw.META_API_VERSION,
      youtubeApiVersion: raw.YOUTUBE_API_VERSION,
      linkedinApiVersion: raw.LINKEDIN_API_VERSION,
      oauthStateTtlSeconds: raw.OAUTH_STATE_TTL_SECONDS,
      meta: meta && { appId: meta.META_APP_ID, appSecret: meta.META_APP_SECRET, redirectUri: meta.META_REDIRECT_URI },
      youtube: youtube && { clientId: youtube.YOUTUBE_CLIENT_ID, clientSecret: youtube.YOUTUBE_CLIENT_SECRET, redirectUri: youtube.YOUTUBE_REDIRECT_URI },
      linkedin: linkedin && { clientId: linkedin.LINKEDIN_CLIENT_ID, clientSecret: linkedin.LINKEDIN_CLIENT_SECRET, redirectUri: linkedin.LINKEDIN_REDIRECT_URI },
    },
    sync: {
      intervalMinutes: raw.SYNC_INTERVAL_MINUTES,
      timeoutMs: raw.SYNC_TIMEOUT_MS,
      leaseSeconds: raw.SYNC_LEASE_SECONDS,
      maxAttempts: raw.SYNC_MAX_ATTEMPTS,
      workerEnabled: raw.SYNC_WORKER_ENABLED,
      workerPollMs: raw.SYNC_WORKER_POLL_MS,
      schedulerEnabled: raw.SYNC_SCHEDULER_ENABLED,
      triggerSecret: raw.JOBS_TRIGGER_SECRET,
    },
    ai: {
      enabled: Boolean(gemini),
      apiKey: gemini?.GEMINI_API_KEY,
      model: gemini?.GEMINI_MODEL,
      timeoutMs: raw.AI_TIMEOUT_MS,
      maxInputChars: raw.AI_MAX_INPUT_CHARS,
      cacheTtlHours: raw.AI_CACHE_TTL_HOURS,
    },
    storage: {
      maxFileBytes: raw.FILE_MAX_BYTES,
      allowedMimeTypes: raw.FILE_ALLOWED_MIME_TYPES,
      presignTtlSeconds: raw.FILE_PRESIGNED_URL_TTL_SECONDS,
      r2: r2 && {
        accountId: r2.R2_ACCOUNT_ID,
        accessKeyId: r2.R2_ACCESS_KEY_ID,
        secretAccessKey: r2.R2_SECRET_ACCESS_KEY,
        bucket: r2.R2_BUCKET,
        endpoint: r2.R2_ENDPOINT,
        publicBaseUrl: raw.R2_PUBLIC_BASE_URL,
      },
    },
    email: smtp && { host: smtp.SMTP_HOST, port: Number(smtp.SMTP_PORT), user: smtp.SMTP_USER, password: smtp.SMTP_PASSWORD, from: smtp.EMAIL_FROM },
  });
}

export type AppConfig = ReturnType<typeof buildConfig>;

function load(): AppConfig {
  try {
    return buildConfig(process.env);
  } catch (err) {
    if (err instanceof ConfigError) {
      // Fail fast with a readable message; no stack trace and no secret values are printed.
      process.stderr.write(`\n${err.message}\n\nSee backend/README.md for the full list of variables.\n\n`);
      process.exit(1);
    }
    throw err;
  }
}

export const config: AppConfig = load();
