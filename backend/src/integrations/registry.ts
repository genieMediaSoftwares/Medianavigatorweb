import type { PlatformType } from '../../../shared/types.js';
import { badRequest } from '../lib/errors.js';
import type { ProviderAdapter } from './types.js';
import { instagramAdapter } from './adapters/instagram.adapter.js';
import { facebookAdapter } from './adapters/facebook.adapter.js';
import { youtubeAdapter } from './adapters/youtube.adapter.js';
import { linkedinAdapter } from './adapters/linkedin.adapter.js';

const adapters: Record<PlatformType, ProviderAdapter> = {
  instagram: instagramAdapter,
  facebook: facebookAdapter,
  youtube: youtubeAdapter,
  linkedin: linkedinAdapter,
};

export const PLATFORMS = Object.keys(adapters) as PlatformType[];

export function getAdapter(platform: string): ProviderAdapter {
  const a = adapters[platform as PlatformType];
  if (!a) throw badRequest(`Unsupported platform: ${platform}`);
  return a;
}
