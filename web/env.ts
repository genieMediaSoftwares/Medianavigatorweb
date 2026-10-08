/**
 * The only module that reads process.env.
 *
 * Every value comes from web/.env (or the host's environment, using the same names). There are no defaults and no
 * fallbacks: a missing or malformed value stops `next build`, `next dev` and `next start` with a message naming every
 * problem. next.config.ts imports this file so validation runs before anything else.
 *
 * None of these values are exposed to the browser (no NEXT_PUBLIC_ variables). The browser only ever talks to this
 * app's own /api/v1 route handlers, which call API_BASE_URL from the server.
 */
import { z } from 'zod';

const required = (name: string) => z.string({ error: `${name} is required` }).trim().min(1, `${name} must not be empty`);

const schema = z.object({
  /** Origin of the Media Navigator API, e.g. https://api.example.com (no path, no trailing /api/v1). */
  API_BASE_URL: required('API_BASE_URL')
    .pipe(z.url({ error: 'API_BASE_URL must be a valid URL' }))
    .refine((v) => {
      const u = new URL(v);
      return (u.pathname === '/' || u.pathname === '') && !u.search && !u.hash;
    }, 'API_BASE_URL must be an origin only (no path, query or hash)'),
  /** "true" to mark auth cookies Secure (required when served over https). "false" only for plain-http local development. */
  COOKIE_SECURE: required('COOKIE_SECURE')
    .refine((v) => v === 'true' || v === 'false', 'COOKIE_SECURE must be "true" or "false"')
    .transform((v) => v === 'true'),
  /** Legal name of whoever operates this deployment. Shown on the Terms and Privacy pages. */
  OPERATOR_NAME: required('OPERATOR_NAME').pipe(z.string().max(200)),
  /** Support / privacy contact address. Shown on the Terms, Privacy and "email isn't set up" screens. */
  SUPPORT_EMAIL: required('SUPPORT_EMAIL').pipe(z.email({ error: 'SUPPORT_EMAIL must be a valid email address' })),
});

export type Env = {
  apiBaseUrl: string;
  cookieSecure: boolean;
  operatorName: string;
  supportEmail: string;
};

export class EnvError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid web configuration:\n - ${problems.join('\n - ')}\n\nSee web/README.md for the full list of variables.`);
    this.name = 'EnvError';
  }
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  const parsed = schema.safeParse({
    API_BASE_URL: source.API_BASE_URL,
    COOKIE_SECURE: source.COOKIE_SECURE,
    OPERATOR_NAME: source.OPERATOR_NAME,
    SUPPORT_EMAIL: source.SUPPORT_EMAIL,
  });
  if (!parsed.success) throw new EnvError(parsed.error.issues.map((i) => i.message));
  const v = parsed.data;
  return Object.freeze({
    apiBaseUrl: new URL(v.API_BASE_URL).origin,
    cookieSecure: v.COOKIE_SECURE,
    operatorName: v.OPERATOR_NAME,
    supportEmail: v.SUPPORT_EMAIL,
  });
}

let cached: Env | undefined;

/** Validated configuration. Throws EnvError (never returns partial config) when anything is missing or invalid. */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
