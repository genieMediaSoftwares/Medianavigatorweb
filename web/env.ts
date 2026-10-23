import { z } from 'zod';

/**
 * Server-side environment. Validated once, fails fast with a readable message, and has no defaults:
 * a missing value stops the build/start instead of silently pointing somewhere else.
 * Never import this from a Client Component.
 */
const optional = z.string().trim().optional().transform((v) => v || undefined);
const schema = z.object({
  NODE_ENV: z.string().optional(),
  API_BASE_URL: z
    .string({ error: 'API_BASE_URL is required (the origin of the Media Navigator API, e.g. https://api.example.com)' })
    .url('API_BASE_URL must be a full URL such as https://api.example.com')
    .refine((v) => /^https?:\/\//.test(v), 'API_BASE_URL must start with http:// or https://')
    .transform((v) => v.replace(/\/+$/, '')),
  // Shown on the legal pages. Required in production so the pages never ship with placeholders.
  OPERATOR_NAME: optional,
  SUPPORT_EMAIL: optional.pipe(z.string().email('SUPPORT_EMAIL must be an email address').optional()),
  // Separate admin application. Optional: /admin says it is not configured instead of guessing an address.
  ADMIN_APP_URL: optional.pipe(z.string().url('ADMIN_APP_URL must be a full URL').optional()),
}).superRefine((env, ctx) => {
  if (env.NODE_ENV !== 'production') return;
  if (env.ADMIN_APP_URL && !env.ADMIN_APP_URL.startsWith('https://')) ctx.addIssue({ code: 'custom', path: ['ADMIN_APP_URL'], message: 'ADMIN_APP_URL must use https in production' });
  // The proxy forwards bearer tokens to this origin, so production must use TLS.
  if (!env.API_BASE_URL.startsWith('https://')) ctx.addIssue({ code: 'custom', path: ['API_BASE_URL'], message: 'API_BASE_URL must use https in production' });
  if (!env.OPERATOR_NAME) ctx.addIssue({ code: 'custom', path: ['OPERATOR_NAME'], message: 'OPERATOR_NAME is required in production (shown on the legal pages)' });
  if (!env.SUPPORT_EMAIL) ctx.addIssue({ code: 'custom', path: ['SUPPORT_EMAIL'], message: 'SUPPORT_EMAIL is required in production (shown on the legal pages)' });
});

export type Env = z.infer<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.') || 'env'}: ${i.message}`);
    throw new Error(`Invalid environment for the Media Navigator web app:\n${lines.join('\n')}`);
  }
  return result.data;
}

let cached: Env | undefined;
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
