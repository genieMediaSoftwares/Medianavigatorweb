import fs from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';
import { parseEnv } from './env';

/**
 * The project keeps one env file (backend/.env). The web app only needs the API address from it, so copy that single
 * allow-listed value if the host has not provided it (hosted builds set API_BASE_URL in the platform instead).
 * Nothing else from the backend file ever enters this process.
 */
const ALLOWED_FROM_BACKEND_ENV = ['API_BASE_URL'] as const;
function loadFromBackendEnv(): void {
  const file = path.resolve(process.cwd(), '../backend/.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    const key = m?.[1] as (typeof ALLOWED_FROM_BACKEND_ENV)[number] | undefined;
    if (m && key && ALLOWED_FROM_BACKEND_ENV.includes(key) && !process.env[key]) process.env[key] = m[2]?.replace(/^["']|["']$/g, '');
  }
}
loadFromBackendEnv();
parseEnv(process.env); // fail the build/start now, with a clear message, if anything is missing

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  images: {
    // Thumbnails come from the social platforms' own CDNs and their hosts are not known ahead of time, so they are
    // rendered as-is (no image proxy) instead of listing hosts in this file.
    unoptimized: true,
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
};

export default config;
