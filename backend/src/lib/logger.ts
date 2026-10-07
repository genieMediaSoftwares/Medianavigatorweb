import { config } from '../config/env.js';

type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN: Level = config.server.isTest ? 'error' : config.server.isProduction ? 'info' : 'debug';

// Keys whose values must never reach logs. Matching is case-insensitive on the key name.
const SECRET_KEY = /pass(word)?|secret|token|authorization|cookie|api[-_]?key|credential|mongodb_uri|signature/i;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[truncated]';
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value instanceof Error) return { name: value.name, message: scrub(value.message) };
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SECRET_KEY.test(k) ? '[redacted]' : redact(v, depth + 1)]),
    );
  }
  return typeof value === 'string' ? scrub(value) : value;
}

/** Strips access tokens and credentials embedded in URLs / messages. */
function scrub(text: string): string {
  return text
    .replace(/(access_token|client_secret|key|token|code)=([^&\s"']+)/gi, '$1=[redacted]')
    .replace(/mongodb(\+srv)?:\/\/[^\s"']+/gi, 'mongodb://[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [redacted]');
}

function write(level: Level, msg: string, fields?: Record<string, unknown>) {
  if (ORDER[level] < ORDER[MIN]) return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...(fields ? (redact(fields) as object) : {}) });
  (level === 'error' || level === 'warn' ? process.stderr : process.stdout).write(line + '\n');
}

export const logger = {
  debug: (msg: string, f?: Record<string, unknown>) => write('debug', msg, f),
  info: (msg: string, f?: Record<string, unknown>) => write('info', msg, f),
  warn: (msg: string, f?: Record<string, unknown>) => write('warn', msg, f),
  error: (msg: string, f?: Record<string, unknown>) => write('error', msg, f),
};
