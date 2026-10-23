/** One network budget for the mobile client and both server-side browser proxies. */
export const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
export const MEDIA_ANALYSIS_TIMEOUT_MS = 240_000;

export function requestTimeoutMs(path: string): number {
  return /^\/intelligence\/(?:diagnose-post|analyze-video|content-analysis(?:\/upload)?|deep-report|creative-report)(?:\?|$)/.test(path)
    ? MEDIA_ANALYSIS_TIMEOUT_MS : DEFAULT_REQUEST_TIMEOUT_MS;
}
