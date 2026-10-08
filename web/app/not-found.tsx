import Link from 'next/link';
import { Compass } from 'lucide-react';
import { buttonClass } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <Compass className="mx-auto size-10 text-action" aria-hidden />
        <h1 className="mt-3 font-display text-4xl font-semibold">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-ink-muted">The link may be old or mistyped. Let&apos;s get you back on course.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/home" className={buttonClass('primary')}>Go to Home</Link>
          <Link href="/" className={buttonClass('secondary')}>Main page</Link>
        </div>
      </div>
    </main>
  );
}
