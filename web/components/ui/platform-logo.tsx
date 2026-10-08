import type { Platform } from '@/types/api';
import { cn } from '@/lib/utils';
import { platformName } from '@/lib/platforms';

/** Platform marks in their real brand colours, kept small inside a neutral tile so they never fight the brand blue. */
export function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  const common = { viewBox: '0 0 24 24', className: cn('h-5 w-5', className), role: 'img' as const, 'aria-label': platformName(platform) };
  switch (platform) {
    case 'instagram':
      return (
        <svg {...common}><defs><linearGradient id="ig-g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#FEDA75" /><stop offset=".35" stopColor="#FA7E1E" /><stop offset=".6" stopColor="#D62976" /><stop offset=".8" stopColor="#962FBF" /><stop offset="1" stopColor="#4F5BD5" /></linearGradient></defs>
          <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-g)" /><circle cx="12" cy="12" r="4.6" fill="none" stroke="#fff" strokeWidth="1.9" /><circle cx="17.3" cy="6.7" r="1.2" fill="#fff" /></svg>
      );
    case 'youtube':
      return (<svg {...common}><rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill="#FF0000" /><path d="M10 9l5.2 3L10 15z" fill="#fff" /></svg>);
    case 'facebook':
      return (<svg {...common}><circle cx="12" cy="12" r="10.5" fill="#1877F2" /><path d="M13.2 20.5v-7h2.3l.4-2.8h-2.7V9c0-.8.3-1.4 1.4-1.4h1.4V5.2c-.3 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.600v2h-2.300v2.800h2.300v7z" fill="#fff" /></svg>);
    case 'linkedin':
      return (<svg {...common}><rect x="2" y="2" width="20" height="20" rx="4" fill="#0A66C2" /><path d="M7.2 9.8h2.2V17H7.2zM8.3 6.6a1.3 1.3 0 110 2.600 1.3 1.3 0 010-2.600zM10.900 9.800h2.100v1c.3-.6 1.100-1.200 2.200-1.200 2.300 0 2.700 1.500 2.700 3.500V17h-2.200v-3.400c0-.8 0-1.900-1.200-1.900s-1.400.9-1.400 1.800V17h-2.200z" fill="#fff" /></svg>);
  }
}

export function PlatformTile({ platform, size = 'md', className }: { platform: Platform; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-xl bg-app border border-line', size === 'sm' && 'h-8 w-8', size === 'md' && 'h-10 w-10', size === 'lg' && 'h-14 w-14 rounded-2xl', className)}>
      <PlatformIcon platform={platform} className={size === 'lg' ? 'h-8 w-8' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
    </span>
  );
}
