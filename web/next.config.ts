import type { NextConfig } from 'next';
import path from 'node:path';
import { parseEnv } from './env';

// One source only: web/.env locally (loaded by Next.js), the platform's environment when hosted.
parseEnv(process.env); // fail the build/start now, with a clear message, if anything is missing

const config: NextConfig = {
  // The shared request/password policies live beside web/ and admin/.
  turbopack: { root: path.resolve(__dirname, '..') },
  outputFileTracingRoot: path.resolve(__dirname, '..'),
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
    }, {
      source: '/reset-password',
      headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'Cache-Control', value: 'no-store' }],
    }];
  },
};

export default config;
