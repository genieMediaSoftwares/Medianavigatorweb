import crypto from 'node:crypto';

/**
 * Time-based one-time passwords (RFC 6238: HMAC-SHA1, 6 digits, 30-second steps), compatible with common authenticator
 * apps. Implemented on node:crypto so no third-party code handles the shared secrets.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, '').replace(/\s+/g, '').toUpperCase();
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error('Invalid base32 secret');
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

/** A new 160-bit shared secret, base32-encoded. */
export const generateTotpSecret = () => base32Encode(crypto.randomBytes(20));

export const timeStep = (ms = Date.now()) => Math.floor(ms / 1000 / STEP_SECONDS);

export function totpAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(code % 10 ** DIGITS).padStart(DIGITS, '0');
}

/**
 * The time step the code matches (current step ±1 for clock drift), or null. Steps at or before `lastUsedStep` are
 * refused, so an observed code cannot be replayed.
 */
export function verifyTotp(secret: string, code: string, lastUsedStep: number | null = null, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const current = timeStep(now);
  for (const step of [current - 1, current, current + 1]) {
    if (lastUsedStep !== null && step <= lastUsedStep) continue;
    const expected = totpAt(secret, step);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(code))) return step;
  }
  return null;
}

export const otpauthUrl = (secret: string, account: string, issuer = 'Media Navigator') =>
  `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;

/** Ten single-use recovery codes like `k3f9-x2m7`. Only their hashes are stored. */
export const generateRecoveryCodes = () =>
  Array.from({ length: 10 }, () => {
    const raw = base32Encode(crypto.randomBytes(5)).toLowerCase().slice(0, 8);
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
export const normaliseRecoveryCode = (code: string) => code.trim().toLowerCase().replace(/[^a-z2-7]/g, '');
