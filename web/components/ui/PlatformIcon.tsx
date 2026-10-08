import type { Platform } from '@/types/api';
import { PLATFORM_LABEL } from '@/lib/copy';
import { cn } from '@/lib/cn';

/** Simplified brand marks drawn in each platform's own colours. */
export function PlatformIcon({ platform, className, decorative = false }: { platform: Platform; className?: string; decorative?: boolean }) {
  const a11y = decorative ? { 'aria-hidden': true as const } : { role: 'img' as const, 'aria-label': PLATFORM_LABEL[platform] };
  const cls = cn('size-6 shrink-0', className);
  switch (platform) {
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" className={cls} {...a11y}>
          <defs>
            <linearGradient id="mn-ig" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#FEDA75" />
              <stop offset="0.35" stopColor="#FA7E1E" />
              <stop offset="0.65" stopColor="#D62976" />
              <stop offset="1" stopColor="#4F5BD5" />
            </linearGradient>
          </defs>
          <rect x="1" y="1" width="22" height="22" rx="6.5" fill="url(#mn-ig)" />
          <rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" strokeWidth="1.8" />
          <circle cx="16.3" cy="7.7" r="1" fill="#fff" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" className={cls} {...a11y}>
          <circle cx="12" cy="12" r="11" fill="#1877F2" />
          <path d="M13.3 20v-6.2h2.1l.3-2.4h-2.4V9.9c0-.7.2-1.2 1.2-1.2h1.3V6.6a17 17 0 0 0-1.9-.1c-1.9 0-3.2 1.2-3.2 3.3v1.7H8.6v2.4h2.1V20h2.6Z" fill="#fff" />
        </svg>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" className={cls} {...a11y}>
          <rect x="1" y="4.5" width="22" height="15" rx="4.5" fill="#FF0000" />
          <path d="M10 8.8v6.4l5.4-3.2L10 8.8Z" fill="#fff" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" className={cls} {...a11y}>
          <rect x="1" y="1" width="22" height="22" rx="4" fill="#0A66C2" />
          <rect x="5.2" y="9.6" width="2.9" height="8.8" fill="#fff" />
          <circle cx="6.65" cy="6.6" r="1.7" fill="#fff" />
          <path d="M10.4 9.6h2.8v1.2c.4-.8 1.4-1.4 2.8-1.4 2.6 0 3.2 1.7 3.2 3.9v5.1h-2.9v-4.5c0-1.1-.1-2.2-1.5-2.2s-1.6 1-1.6 2.1v4.6h-2.8V9.6Z" fill="#fff" />
        </svg>
      );
  }
}
