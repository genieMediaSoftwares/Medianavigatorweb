/**
 * Turns Google API error responses into plain messages. Raw provider objects and credential values never reach the user.
 * Reasons come from `error.details[].reason` (google.rpc.ErrorInfo) or the legacy `error.errors[].reason`.
 */
export type YouTubeErrorKind = 'invalid' | 'expired' | 'permission' | 'quota' | 'not_found' | 'unavailable';

export class YouTubeApiError extends Error {
  constructor(message: string, readonly kind: YouTubeErrorKind) {
    super(message);
    this.name = 'YouTubeApiError';
  }
}

function reasonsOf(body: any): string[] {
  const e = body?.error ?? {};
  return [
    ...((e.details ?? []) as Array<{ reason?: string }>).map((d) => d.reason),
    ...((e.errors ?? []) as Array<{ reason?: string }>).map((d) => d.reason),
    e.status,
  ].filter((r): r is string => typeof r === 'string');
}

/** `api` names the API in messages, e.g. "YouTube Data API v3". `credential` is how the request was authorised. */
export function describeGoogleError(status: number, body: unknown, api: string, credential: 'api_key' | 'oauth'): YouTubeApiError {
  const reasons = reasonsOf(body);
  const has = (...r: string[]) => reasons.some((x) => r.includes(x));

  if (has('API_KEY_INVALID', 'keyInvalid', 'API_KEY_EXPIRED', 'keyExpired')) {
    return new YouTubeApiError('Google says this API key isn’t valid. Copy it again from Google Cloud Console → APIs & Services → Credentials.', 'invalid');
  }
  if (has('SERVICE_DISABLED', 'accessNotConfigured')) {
    return new YouTubeApiError(`${api} isn’t enabled in the Google Cloud project this ${credential === 'api_key' ? 'key' : 'sign-in'} belongs to. Enable it under APIs & Services → Library, wait a minute, then try again.`, 'permission');
  }
  if (has('API_KEY_SERVICE_BLOCKED', 'API_KEY_HTTP_REFERRER_BLOCKED', 'API_KEY_IP_ADDRESS_BLOCKED', 'API_KEY_ANDROID_APP_BLOCKED', 'API_KEY_IOS_APP_BLOCKED', 'ipRefererBlocked')) {
    return new YouTubeApiError(`This API key’s restrictions block the Media Navigator server. In Credentials, edit the key: allow ${api} under “API restrictions” and set “Application restrictions” to None or to this server’s IP address.`, 'permission');
  }
  if (has('quotaExceeded', 'dailyLimitExceeded', 'rateLimitExceeded', 'userRateLimitExceeded', 'RESOURCE_EXHAUSTED', 'RATE_LIMIT_EXCEEDED')) {
    return new YouTubeApiError('Your Google Cloud project has used its YouTube API quota for today. It resets at midnight Pacific Time; try again after that.', 'quota');
  }
  if (has('ACCESS_TOKEN_SCOPE_INSUFFICIENT', 'insufficientPermissions')) {
    return new YouTubeApiError(`Your Google sign-in didn’t grant access to ${api}. Connect your Google account again and allow every requested permission.`, 'permission');
  }
  if (status === 401 || has('authError', 'UNAUTHENTICATED')) {
    return new YouTubeApiError('Your Google sign-in has expired or was revoked. Connect your Google account again.', 'expired');
  }
  if (status === 404 || has('channelNotFound', 'NOT_FOUND')) {
    return new YouTubeApiError('That YouTube channel couldn’t be found. Check the channel ID or @handle.', 'not_found');
  }
  if (status === 403 || has('forbidden', 'PERMISSION_DENIED')) {
    return new YouTubeApiError(`Google refused access to ${api} for this ${credential === 'api_key' ? 'API key' : 'Google account'}.`, 'permission');
  }
  if (status >= 500) return new YouTubeApiError('YouTube isn’t responding right now. Please try again in a few minutes.', 'unavailable');
  return new YouTubeApiError(`YouTube couldn’t complete the request (HTTP ${status}). Please try again.`, 'unavailable');
}

export type ChannelReference = { id: string } | { handle: string } | { videoId: string };

/**
 * Exact channel references only: a channel ID (UC + 22 characters), an @handle, a youtube.com/channel/… or
 * youtube.com/@… link, or a link to one of the channel's videos (watch/shorts/youtu.be) whose owner we resolve.
 * Anything else is refused instead of searched, so a typo can't connect someone else's channel.
 */
export function parseExactChannel(input: string): ChannelReference | null {
  const ID = /^UC[A-Za-z0-9_-]{22}$/;
  const HANDLE = /^@[A-Za-z0-9._-]{3,30}$/;
  const VIDEO = /^[A-Za-z0-9_-]{11}$/;
  const raw = input.trim();
  if (ID.test(raw)) return { id: raw };
  if (HANDLE.test(raw)) return { handle: raw };
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./i, '');
    if (host === 'youtu.be') {
      const [id] = url.pathname.split('/').filter(Boolean);
      return id && VIDEO.test(id) ? { videoId: id } : null;
    }
    if (!/(^|\.)youtube\.com$/i.test(host)) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    const v = url.searchParams.get('v');
    if (v && VIDEO.test(v)) return { videoId: v };
    if (parts[0] === 'shorts' && parts[1] && VIDEO.test(parts[1])) return { videoId: parts[1] };
    if (parts[0] === 'channel' && parts[1] && ID.test(parts[1])) return { id: parts[1] };
    if (parts[0] && HANDLE.test(decodeURIComponent(parts[0]))) return { handle: decodeURIComponent(parts[0]) };
  } catch {
    return null;
  }
  return null;
}

export const looksLikeApiKey = (v: string) => /^AIza[0-9A-Za-z_-]{35}$/.test(v.trim());
