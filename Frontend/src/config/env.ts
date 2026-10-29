// EXPO_PUBLIC_* variables are inlined at build time by Metro/Babel and must be read statically.
const rawApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

/**
 * Validates the backend API origin. There is no fallback: a missing or malformed value stops the app with a clear
 * error. Release bundles (anything that is not a development build) must use https, because the app sends tokens there.
 */
export function parseApiBaseUrl(raw: string | undefined, isDevelopmentBuild: boolean): string {
  const url = raw?.trim();
  if (!url) {
    throw new Error('Missing required environment variable: EXPO_PUBLIC_API_BASE_URL (Frontend/.env locally, eas.json "env" for EAS builds)');
  }
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('Invalid EXPO_PUBLIC_API_BASE_URL: must start with http:// or https://');
  }
  if (!isDevelopmentBuild && !/^https:\/\//i.test(url)) {
    throw new Error('Invalid EXPO_PUBLIC_API_BASE_URL: release builds must use https://');
  }
  return url.replace(/\/+$/, '');
}

/** Returns the backend API origin taken only from EXPO_PUBLIC_API_BASE_URL. */
export function getApiBaseUrl(): string {
  return parseApiBaseUrl(rawApiBaseUrl, typeof __DEV__ !== 'undefined' && __DEV__);
}
