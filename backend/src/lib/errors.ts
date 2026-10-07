export type ErrorCode =
  | 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE' | 'VALIDATION_ERROR' | 'RATE_LIMITED'
  | 'INTERNAL_ERROR' | 'PROVIDER_ERROR' | 'SERVICE_UNAVAILABLE';

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413, VALIDATION_ERROR: 422, RATE_LIMITED: 429,
  INTERNAL_ERROR: 500, PROVIDER_ERROR: 502, SERVICE_UNAVAILABLE: 503,
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
export const unauthorized = (m = 'Authentication required') => new AppError('UNAUTHORIZED', m);
export const forbidden = (m = 'You do not have permission to perform this action') => new AppError('FORBIDDEN', m);
export const notFound = (m = 'Resource not found') => new AppError('NOT_FOUND', m);
export const conflict = (m: string) => new AppError('CONFLICT', m);
export const unavailable = (m: string) => new AppError('SERVICE_UNAVAILABLE', m);
export const providerError = (m: string, d?: unknown) => new AppError('PROVIDER_ERROR', m, d);

/** Raised by provider calls so callers can tell expired credentials from transient failures. */
export class ProviderAuthError extends AppError {
  constructor(message: string, public readonly kind: 'expired' | 'permission') {
    super('PROVIDER_ERROR', message);
    this.name = 'ProviderAuthError';
  }
}
