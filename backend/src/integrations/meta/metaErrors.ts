import { ConnectError, type ConnectFailureReason } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

/** The `error` object of a Meta Graph API response. */
export interface MetaErrorBody {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

/**
 * A Graph API refusal, already translated: `reason` says what kind of problem it is and `message` what the account owner
 * can do about it. The raw provider text is kept in `providerMessage` for logs only.
 */
export class MetaApiError extends Error {
  constructor(
    message: string,
    readonly reason: ConnectFailureReason,
    readonly providerCode: number | null,
    readonly providerSubcode: number | null,
    readonly providerMessage: string,
  ) {
    super(message);
    this.name = 'MetaApiError';
  }

  toConnectError(): ConnectError {
    return new ConnectError(this.reason, this.message);
  }
}

/** Permissions a pasted token needs to connect and read posts/insights, as listed in the app's setup steps. */
export const REQUIRED_PERMISSIONS: Record<'instagram' | 'facebook', string[]> = {
  facebook: ['pages_show_list', 'pages_read_engagement', 'read_insights'],
  instagram: ['instagram_basic', 'instagram_manage_insights', 'pages_show_list', 'pages_read_engagement'],
};

const EXPLORER_HINT = 'In Graph API Explorer, pick your own Meta app (not another app), add the permissions listed in the setup steps, generate a new token and test GET /me?fields=id,name before connecting.';

/**
 * Meta error codes: https://developers.facebook.com/docs/graph-api/guides/error-handling
 *  190 token invalid/expired (subcodes 458/460/463/467 say why) · 102 session problem · 10 and 200–299 permission ·
 *  200 "API access blocked" = the app itself is restricted · 4/17/32/613 rate limits · 1/2 transient · 100 bad parameter.
 */
export function describeMetaError(platform: 'instagram' | 'facebook', body: { error?: MetaErrorBody } | null | undefined, status: number): MetaApiError {
  const e = body?.error ?? {};
  const raw = e.message ?? `HTTP ${status}`;
  const code = typeof e.code === 'number' ? e.code : null;
  const sub = typeof e.error_subcode === 'number' ? e.error_subcode : null;
  const name = platform === 'instagram' ? 'Instagram' : 'Facebook';
  const make = (reason: ConnectFailureReason, message: string) => new MetaApiError(message, reason, code, sub, scrubToken(raw));

  if (/api access blocked/i.test(raw) || code === 368) {
    return make('app_restricted', `Meta returned “API access blocked” for this token. This response alone does not identify whether the restriction is on the Meta app, business or account. Check the token in Meta’s Access Token Debugger and check the app’s alerts and Business Support Home. If the website already connected this account, use the same Media Navigator login and API server, then refresh the app’s connections; you do not need to paste the token again. Otherwise resolve the restriction in Meta and generate a new token with the required permissions. Media Navigator cannot remove a Meta restriction.`);
  }
  if (code === 190 || code === 102) {
    if (sub === 463 || sub === 467 || /expired/i.test(raw)) return make('token_expired', `This ${name} access token has expired. Generate a new one and connect again.`);
    if (sub === 458) return make('token_expired', `The Meta app was removed from this account’s settings, so its token no longer works. ${EXPLORER_HINT}`);
    if (sub === 460) return make('token_expired', `The token stopped working because the account password changed. Generate a new token and connect again.`);
    return make('token_invalid', `Meta didn’t accept this as a valid ${name} access token. Copy the whole token again (no spaces or line breaks). ${EXPLORER_HINT}`);
  }
  if (code === 10 || (code !== null && code >= 200 && code <= 299)) {
    // Meta usually names the permission ("requires the 'pages_read_engagement' permission"); pass that on exactly.
    const named = [...new Set(raw.match(/\b(?:pages_[a-z_]+|instagram_[a-z_]+|read_insights|business_management)\b/g) ?? [])];
    if (named.length) {
      return make('permission_missing', `This token is missing the ${named.join(' and ')} permission${named.length > 1 ? 's' : ''}. In Graph API Explorer, add ${named.join(', ')} under Permissions, click Generate Access Token, select your ${platform === 'instagram' ? 'Facebook Page linked to your Instagram account' : 'Page'} when Meta asks which Pages to share, then connect again.`);
    }
    return make('permission_missing', `The token is missing a permission ${name} needs. Meta said: “${scrubToken(raw).slice(0, 200)}”. Generate a new token with ${REQUIRED_PERMISSIONS[platform].join(', ')}, and select your Page when Meta asks which Pages to share.`);
  }
  if (code === 4 || code === 17 || code === 32 || code === 613) {
    return make('provider_unavailable', `Meta is rate-limiting requests for this app or account. Wait a few minutes and try again.`);
  }
  if (code === 1 || code === 2 || status >= 500) {
    return make('provider_unavailable', `${name} isn’t responding right now. Please try again in a few minutes.`);
  }
  // 100 is always about a parameter or object (unknown ID, field or path), never about the token itself.
  if (code === 100) {
    return make('account_not_found', `${name} couldn’t find that object with this token. Check the ID, and that the token belongs to an account that manages it.`);
  }
  // An unrecognised refusal: show what Meta actually said, so the real cause can be acted on instead of guessed at.
  const said = e.message ? ` Meta said: “${scrubToken(e.message).slice(0, 200)}”${code !== null ? ` (code ${code}${sub !== null ? `, subcode ${sub}` : ''})` : ''}.` : ` (HTTP ${status})`;
  return make('token_invalid', `${name} refused the request.${said} ${EXPLORER_HINT}`);
}

/** Meta messages occasionally echo request parameters; never show a token back to the user. */
function scrubToken(text: string): string {
  return text.replace(/\b(EAA|IGAA|IGQ)[A-Za-z0-9_-]{20,}/g, '[token]').replace(/(access_token=)[^&\s]+/gi, '$1[token]');
}

/** Records what Meta actually said (never the token) so the real cause can be diagnosed from the server logs. */
export function logMetaError(operation: string, err: MetaApiError, requestId?: string) {
  logger.warn('meta request refused', { operation, requestId, reason: err.reason, providerCode: err.providerCode, providerSubcode: err.providerSubcode, providerMessage: scrubToken(err.providerMessage).slice(0, 300) });
}
