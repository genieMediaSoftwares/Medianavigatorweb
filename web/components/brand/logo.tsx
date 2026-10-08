import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/** The "M" with the navigation arrow, from the supplied artwork. Never stretched or recoloured. */
export function LogoMark({ className, size = 36 }: { className?: string; size?: number }) {
  return <Image src="/brand/mark.png" alt="" width={size} height={Math.round(size * 1.07)} priority unoptimized className={cn('h-auto select-none', className)} style={{ width: size }} />;
}

/** Mark + the wordmark in text ("Media" in navy, "Navigator" in brand blue) so it follows light and dark themes. */
export function Wordmark({ className, collapsed, href = '/' }: { className?: string; collapsed?: boolean; href?: string }) {
  return (
    <Link href={href} aria-label="Media Navigator home" className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={32} />
      {!collapsed && (
        <span className="font-display text-[19px] font-extrabold leading-none tracking-tight">
          <span className="text-ink">Media</span><span className="text-brand-600">Navigator</span>
        </span>
      )}
    </Link>
  );
}

/** The full lockup (mark, orbiting platforms, wordmark and tagline) for the landing and sign-in pages. Light backgrounds only. */
export function LogoLockup({ className, width = 300 }: { className?: string; width?: number }) {
  return <Image src="/brand/logo.png" alt="Media Navigator: connect, analyze, improve, grow" width={width} height={Math.round(width * 0.3194)} priority unoptimized className={cn('h-auto select-none', className)} style={{ width }} />;
}
