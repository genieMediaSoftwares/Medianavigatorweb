import Link from 'next/link';
import { Logo } from '@/components/layout/Logo';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-10">
      <Link href="/" className="mb-8 min-h-11 content-center" aria-label="Media Navigator home">
        <Logo />
      </Link>
      <main id="main" className="w-full max-w-md rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
        {children}
      </main>
      <nav aria-label="Legal" className="mt-6 flex gap-4 text-sm text-ink-muted">
        <Link href="/terms" className="min-h-11 content-center hover:text-ink">Terms</Link>
        <Link href="/privacy" className="min-h-11 content-center hover:text-ink">Privacy</Link>
      </nav>
    </div>
  );
}
