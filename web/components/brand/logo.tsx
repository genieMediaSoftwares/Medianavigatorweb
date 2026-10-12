import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/** The "M" with the navigation arrow, from the supplied artwork. Never stretched or recoloured. */
export function LogoMark({ className, size = 36 }: { className?: string; size?: number }) {
  return <Image src="/brand/mark.png" alt="Media Navigator logo" width={size} height={Math.round(size * 1.07)} priority unoptimized className={cn('h-auto select-none transition-transform duration-300 hover:scale-105', className)} style={{ width: size }} />;
}

/** Mark + the wordmark ("MEDIA" in dark navy/ink, "NAVIGATOR" in sky blue) with optional tagline. */
export function Wordmark({ className, collapsed, showTagline = false, href = '/' }: { className?: string; collapsed?: boolean; showTagline?: boolean; href?: string }) {
  return (
    <Link href={href} aria-label="Media Navigator home" className={cn('group inline-flex items-center gap-3', className)}>
      <LogoMark size={34} />
      {!collapsed && (
        <div className="flex flex-col">
          <span className="font-display text-[19px] font-extrabold leading-none tracking-tight">
            <span className="text-ink">MEDIA </span>
            <span className="text-[#1D5FD1] dark:text-brand-300">NAVIGATOR</span>
          </span>
          {showTagline && (
            <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-subtle">
              CONNECT • ANALYZE • IMPROVE • GROW
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

/** The full lockup (mark, orbiting platforms, wordmark and tagline) for the landing and sign-in pages. Light backgrounds only. */
export function LogoLockup({ className, width = 300 }: { className?: string; width?: number }) {
  return <Image src="/brand/logo.png" alt="Media Navigator: CONNECT • ANALYZE • IMPROVE • GROW" width={width} height={Math.round(width * 0.3194)} priority unoptimized className={cn('h-auto select-none transition-transform duration-300 hover:scale-[1.02]', className)} style={{ width }} />;
}

