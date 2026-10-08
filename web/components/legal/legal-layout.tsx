import Link from 'next/link';
import type { ReactNode } from 'react';
import { Wordmark } from '@/components/brand/logo';

export function Operator() {
  return (
    <div className="my-8 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 p-5 text-[15px]">
      <p className="font-semibold text-ink">Operator: [to be added by the owner]</p>
      <p className="mt-1 font-semibold text-ink">Contact: [to be added by the owner]</p>
    </div>
  );
}

export function LegalLayout({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-app">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-[72px] max-w-5xl items-center justify-between px-4 sm:px-6">
          <Wordmark />
          <Link href="/" className="text-sm font-semibold text-brand-600 hover:underline">Back to home</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-[32px] sm:text-[40px]">{title}</h1>
        <p className="mt-2 text-sm text-subtle">Last updated {updated}</p>
        <Operator />
        <div className="space-y-4 text-[16px] leading-7 text-text [&_h2]:mt-10 [&_h2]:text-2xl [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_a]:font-semibold [&_a]:text-brand-600 [&_a:hover]:underline">{children}</div>
      </main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-6">
          <span>Media Navigator</span>
          <nav aria-label="Legal" className="flex gap-5 font-semibold"><Link href="/terms" className="hover:text-ink">Terms</Link><Link href="/privacy" className="hover:text-ink">Privacy</Link></nav>
        </div>
      </footer>
    </div>
  );
}
