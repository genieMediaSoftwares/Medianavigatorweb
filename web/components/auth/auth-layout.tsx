import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, BarChart3, Lock, Sparkles } from 'lucide-react';
import { LogoLockup, Wordmark } from '@/components/brand/logo';

const POINTS = [
  { icon: BarChart3, title: 'See what actually works', text: 'Every post is compared with your own results, not a generic benchmark.' },
  { icon: Sparkles, title: 'Know what to do next', text: 'Clear ideas and the best times to post, based on your own posts.' },
  { icon: Lock, title: 'Read-only and private', text: 'We can’t post, edit or delete anything. Access is encrypted.' },
];

/** Shared frame for sign in, sign up and password pages: form on the left, brand panel on the right. */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Wordmark />
          <Link href="/" className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-brand-50"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back</Link>
        </div>
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">
          <h1 className="text-[32px] leading-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-muted">{footer}</div>}
        </div>
      </div>
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between p-12 text-white" style={{ background: 'linear-gradient(150deg, #0a2c8f 0%, #0b5fe6 58%, #18b8f8 120%)' }}>
        <div aria-hidden="true" className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-[#18b8f8]/30 blur-3xl" />
        <div className="relative rounded-2xl bg-white p-5 shadow-[var(--shadow-pop)] self-start"><LogoLockup width={260} /></div>
        <div className="relative">
          <p className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight">Know what to post <span className="text-[#bfe9ff]">before</span> you post it.</p>
          <ul className="mt-10 space-y-6">
            {POINTS.map(({ icon: Icon, title: t, text }) => (
              <li key={t} className="flex gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15"><Icon className="h-5 w-5" aria-hidden="true" /></span><div><p className="font-semibold">{t}</p><p className="text-sm text-white/80">{text}</p></div></li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
