export type ErrorCode =
  | 'BAD_REQUEST' | 'INVALID_CREDENTIALS' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE' | 'VALIDATION_ERROR' | 'RATE_LIMITED'
  | 'INTERNAL_ERROR' | 'PROVIDER_ERROR' | 'SERVICE_UNAVAILABLE' | 'MEDIA_UNAVAILABLE'
  | 'MFA_REQUIRED' | 'REAUTH_REQUIRED' | 'MFA_ENROLLMENT_REQUIRED';

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400, INVALID_CREDENTIALS: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413, VALIDATION_ERROR: 422, RATE_LIMITED: 429,
  INTERNAL_ERROR: 500, PROVIDER_ERROR: 502, SERVICE_UNAVAILABLE: 503, MEDIA_UNAVAILABLE: 422,
  // 403, never 401: these ask for more proof from a valid session or sign-in; they must not end the session.
  MFA_REQUIRED: 403, REAUTH_REQUIRED: 403, MFA_ENROLLMENT_REQUIRED: 403,
};

export class AppError extends Error {
  readonly status: number;
  constructor(public readonly code: ErrorCode, message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = STATUS[code];
  }
}

export const badRequest = (m: string, d?: unknown) => new AppError('BAD_REQUEST', m, d);
// Password confirmation within an authenticated workflow must not expire the client's session.
export const invalidCredentials = (m: string) => new AppError('INVALID_CREDENTIALS', m);
export const unauthorized = (m = 'Authentication required') => new AppError('UNAUTHORIZED', m);
export const forbidden = (m = 'You do not have permission to perform this action') => new AppError('FORBIDDEN', m);
export const notFound = (m = 'Resource not found') => new AppError('NOT_FOUND', m);
export const conflict = (m: string, d?: unknown) => new AppError('CONFLICT', m, d);
export const unavailable = (m: string) => new AppError('SERVICE_UNAVAILABLE', m);
export const providerError = (m: string, d?: unknown) => new AppError('PROVIDER_ERROR', m, d);
/** The post's actual media could not be obtained, so a content analysis would not be about the real content. */
export const mediaUnavailable = (m: string) => new AppError('MEDIA_UNAVAILABLE', m);

/**
 * Why connecting an account failed, as a stable code clients can act on. The message is plain language with the next
 * step; raw provider responses stay in the server logs.
 */
export type ConnectFailureReason =
  | 'token_invalid' | 'token_expired' | 'permission_missing' | 'app_restricted'
  | 'account_not_found' | 'account_not_authorized' | 'account_selection_required' | 'provider_unavailable';

const CONNECT_CODE: Record<ConnectFailureReason, ErrorCode> = {
  // Never 401: that status means "your Media Navigator session ended" to the clients and signs the user out.
  token_invalid: 'BAD_REQUEST',
  token_expired: 'BAD_REQUEST',
  permission_missing: 'FORBIDDEN',
  app_restricted: 'FORBIDDEN',
  account_not_found: 'NOT_FOUND',
  account_not_authorized: 'FORBIDDEN',
  account_selection_required: 'VALIDATION_ERROR',
  provider_unavailable: 'PROVIDER_ERROR',
};

/** Where connecting stopped: checking the credential, its granted permissions, or finding the account. */
export type ConnectStage = 'token' | 'permissions' | 'account';

export class ConnectError extends AppError {
  constructor(public readonly reason: ConnectFailureReason, message: string, public readonly opts: { field?: string; stage?: ConnectStage } = {}) {
    // A choice the user has to make is reported like any other invalid field, so forms can show it next to the input.
    super(CONNECT_CODE[reason], message, reason === 'account_selection_required' && opts.field
      ? [{ in: 'body', path: opts.field, message, reason, ...(opts.stage ? { stage: opts.stage } : {}) }]
      : { reason, ...(opts.stage ? { stage: opts.stage } : {}) });
    this.name = 'ConnectError';
  }

  /** The same error, labelled with the stage it happened in (an explicit stage set by the thrower wins). */
  atStage(stage: ConnectStage): ConnectError {
    return this.opts.stage ? this : new ConnectError(this.reason, this.message, { ...this.opts, stage });
  }
}

/** Raised by provider calls so callers can tell expired credentials from transient failures. */
export class ProviderAuthError extends AppError {
  constructor(message: string, public readonly kind: 'expired' | 'permission') {
    super('PROVIDER_ERROR', message);
    this.name = 'ProviderAuthError';
  }
}
