import type { ContentType, Platform } from '@/types/api';

export const PLATFORM_NAME: Record<Platform, string> = { instagram: 'Instagram', youtube: 'YouTube', facebook: 'Facebook', linkedin: 'LinkedIn' };

/** Thumbnail shape per platform: portrait for photo/reel feeds, landscape for YouTube. */
export const PLATFORM_ASPECT: Record<Platform, string> = { instagram: 'aspect-[4/5]', facebook: 'aspect-[4/5]', linkedin: 'aspect-[4/5]', youtube: 'aspect-video' };

const TYPE_LABEL: Record<string, string> = { reel: 'Reel', short: 'Short', video: 'Video', post: 'Post', carousel: 'Carousel', article: 'Article' };
export const typeLabel = (t: ContentType | string, basis?: 'provider' | 'inferred'): string => `${TYPE_LABEL[t] ?? t}${basis === 'inferred' ? ' (estimated)' : ''}`;
export const platformName = (p: string): string => PLATFORM_NAME[p as Platform] ?? p;
