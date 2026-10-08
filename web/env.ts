import { z } from 'zod';

/**
 * Server-side environment. Validated once, fails fast with a readable message, and has no defaults:
 * a missing value stops the build/start instead of silently pointing somewhere else.
 * Never import this from a Client Component.
 */
const schema = z.object({
  API_BASE_URL: z
    .string({ error: 'API_BASE_URL is required (the origin of the Media Navigator API, e.g. https://api.example.com)' })
    .url('API_BASE_URL must be a full URL such as https://api.example.com')
    .refine((v) => /^https?:\/\//.test(v), 'API_BASE_URL must start with http:// or https://')
    .transform((v) => v.replace(/\/+$/, '')),
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
