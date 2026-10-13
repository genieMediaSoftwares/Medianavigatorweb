// EXPO_PUBLIC_* variables are inlined at build time by Metro/Babel and must be read statically.
const rawApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

/**
 * Returns the backend API origin, taken only from EXPO_PUBLIC_API_BASE_URL in Frontend/.env.
 * There is no fallback: a missing or malformed value stops the app with a clear error.
 */
export function getApiBaseUrl(): string {
  const url = rawApiBaseUrl?.trim();
  if (!url) {
    throw new Error('Missing required environment variable: EXPO_PUBLIC_API_BASE_URL (set it in Frontend/.env)');
  }
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(`Invalid EXPO_PUBLIC_API_BASE_URL: must start with http:// or https:// (received: "${url}")`);
  }
  return url.replace(/\/+$/, '');
}
