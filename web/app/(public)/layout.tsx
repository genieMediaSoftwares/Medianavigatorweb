import Link from 'next/link';
import { Logo } from '@/components/layout/Logo';
import { buttonClass } from '@/components/ui/Button';

export default function PublicLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-canvas">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" aria-label="Media Navigator home" className="min-h-11 content-center">
            <Logo />
          </Link>
          <nav aria-label="Account" className="flex items-center gap-2">
            <Link href="/sign-in" className={buttonClass('ghost', 'sm')}>Sign in</Link>
            <Link href="/create-account" className={buttonClass('primary', 'sm', 'hidden sm:inline-flex')}>Get started</Link>
          </nav>
        </div>
      </header>
      <main id="main" className="flex-1">{children}</main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-ink-muted sm:px-6">
          <p>Media Navigator reads your results. It never posts for you.</p>
          <nav aria-label="Legal" className="flex gap-4">
            <Link href="/terms" className="min-h-11 content-center hover:text-ink">Terms</Link>
            <Link href="/privacy" className="min-h-11 content-center hover:text-ink">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
