import crypto from 'node:crypto';
import { config } from '../config/env.js';

/**
 * AES-256-GCM envelope for provider credentials. Output format: v1.<iv>.<tag>.<ciphertext> (base64url).
 * Server-side only. Decrypted values must never be logged or returned from an API.
 */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', config.crypto.credentialKey, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), enc.toString('base64url')].join('.');
}

function decryptWith(key: Buffer, iv: string, tag: string, data: string): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}

/**
 * Decrypts with the current key, or, during a rotation, with CREDENTIAL_ENCRYPTION_KEY_PREVIOUS (GCM's tag rejects a
 * wrong key, so the old key is tried only when the current one fails). New values are always encrypted with the
 * current key; scripts/reencrypt-secrets.ts moves old values over.
 */
export function decryptSecret(payload: string): string {
  const [version, iv, tag, data] = payload.split('.');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unsupported ciphertext format');
  try {
    return decryptWith(config.crypto.credentialKey, iv, tag, data);
  } catch (err) {
    if (!config.crypto.previousCredentialKey) throw err;
    return decryptWith(config.crypto.previousCredentialKey, iv, tag, data);
  }
}

/** True when the value is readable with the current key alone (it does not need re-encryption). */
export function encryptedWithCurrentKey(payload: string): boolean {
  const [version, iv, tag, data] = payload.split('.');
  if (version !== 'v1' || !iv || !tag || !data) return false;
  try { decryptWith(config.crypto.credentialKey, iv, tag, data); return true; } catch { return false; }
}

export const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

export function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function pkcePair() {
  const verifier = randomToken(48);
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}
