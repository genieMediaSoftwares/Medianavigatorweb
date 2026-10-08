import { ArrowRight, BarChart3, CalendarCheck, ChevronDown, Clock, Eye, Lock, Plug, Sparkles, Trash2, Trophy, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { LogoLockup, Wordmark } from '@/components/brand/logo';
import { LinkButton } from '@/components/ui/button';
import { PlatformTile } from '@/components/ui/platform-logo';
import { PLATFORMS } from '@/types/api';

const STEPS: Array<{ n: string; icon: LucideIcon; title: string; text: string }> = [
  { n: '1', icon: Plug, title: 'Connect your accounts', text: 'Link Instagram, YouTube, Facebook or LinkedIn in a click. We only read; we never post.' },
  { n: '2', icon: BarChart3, title: 'We compare each post with your own results', text: 'Every post is judged against your usual, so one viral hit doesn’t skew the picture.' },
  { n: '3', icon: Sparkles, title: 'You get clear next steps', text: 'What to repeat, what to fix, and the best times to post, in plain words.' },
];

const FEATURES: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: Trophy, title: 'Judged against your own history', text: 'See which posts did well and which could be better, compared with what is normal for you.' },
  { icon: Clock, title: 'Best times to post', text: 'Find the days and hours when your own posts have done best, in your time zone.' },
  { icon: Eye, title: 'Plain-language insights', text: 'No charts to decode. Short explanations of what happened, why, and what to try.' },
  { icon: CalendarCheck, title: 'A simple planner', text: 'Turn any idea into a planned slot. It’s for your own scheduling, nothing is posted for you.' },
];

const FAQ = [
  { q: 'Can Media Navigator post or delete anything on my accounts?', a: 'No. It only asks for read permission, so it can’t post, edit or delete anything.' },
  { q: 'How are my access details protected?', a: 'They’re encrypted on our server, never shown in your browser, and deleted when you disconnect an account.' },
  { q: 'Where do the numbers come from?', a: 'From the platforms themselves, as of the last update. We show when each account was last updated, and we say “not available” when a platform doesn’t share a number.' },
  { q: 'Does it use AI?', a: 'Some explanations can be written with AI when it’s switched on. We always label what we measured, what we calculated and what is interpretation, and we tell you when AI wasn’t used.' },
  { q: 'Can I delete my data?', a: 'Yes. You can disconnect an account any time, and delete your whole account from Settings.' },
];

export function Landing() {
  return (
    <div className="bg-surface">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-5">
          <Wordmark />
          <nav aria-label="Sections" className="hidden items-center gap-8 text-[15px] font-semibold text-muted md:flex">
            <a href="#how" className="hover:text-ink">How it works</a><a href="#features" className="hover:text-ink">Features</a><a href="#privacy" className="hover:text-ink">Privacy</a><a href="#faq" className="hover:text-ink">FAQ</a>
          </nav>
          <div className="flex items-center gap-2"><LinkButton href="/sign-in" variant="ghost" className="hidden sm:inline-flex">Sign in</LinkButton><LinkButton href="/sign-up">Get started</LinkButton></div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-0 h-[520px] bg-gradient-to-b from-brand-50 to-transparent" />
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-24">
          <div>
            <p className="eyebrow">Connect · Analyze · Improve · Grow</p>
            <h1 className="mt-4 text-[44px] font-extrabold leading-[1.04] sm:text-[58px]">Know what to post <span className="grad-text">before</span> you post it.</h1>
            <p className="mt-6 max-w-xl text-lg text-muted sm:text-xl">Media Navigator connects your Instagram, YouTube, Facebook and LinkedIn, compares every post with your own results, and tells you what to repeat, what to fix and when to publish.</p>
            <div className="mt-8 flex flex-wrap gap-3"><LinkButton href="/sign-up" size="lg">Get started<ArrowRight className="h-5 w-5" aria-hidden="true" /></LinkButton><LinkButton href="#how" variant="secondary" size="lg">See how it works</LinkButton></div>
            <div className="mt-10 flex flex-wrap items-center gap-4 text-sm text-muted"><span className="font-semibold">Works with</span>{PLATFORMS.map((p) => <PlatformTile key={p} platform={p} />)}</div>
          </div>
          <div className="relative">
            <div aria-hidden="true" className="absolute -inset-4 -z-0 rounded-[32px] bg-gradient-to-br from-brand-100 via-transparent to-brand-50 blur-2xl" />
            <div className="card relative p-8 shadow-[var(--shadow-pop)]">
              <div className="flex justify-center rounded-2xl bg-white p-6"><LogoLockup width={360} /></div>
              <p className="eyebrow mt-8">After your first update you get</p>
              <ul className="mt-4 space-y-3 text-[15px] text-text">
                {['Your best posts and the ones that could be better', 'Your strongest days and hours to post', 'Plain-language ideas for what to try next'].map((t) => (
                  <li key={t} className="flex gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /></span>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="scroll-mt-20 border-y border-line bg-app py-20">
        <div className="mx-auto max-w-[1200px] px-5">
          <h2 className="max-w-2xl text-[34px] sm:text-[40px]">From connected account to clear next step.</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ n, icon: Icon, title, text }) => (
              <li key={n} className="card p-7"><div className="flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ background: 'var(--gradient)' }}><Icon className="h-6 w-6" aria-hidden="true" /></span><span className="font-display text-5xl font-extrabold text-brand-100" aria-hidden="true">{n}</span></div><h3 className="mt-5 text-xl">{title}</h3><p className="mt-2 text-muted">{text}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section id="features" className="scroll-mt-20 py-20">
        <div className="mx-auto max-w-[1200px] px-5">
          <h2 className="max-w-2xl text-[34px] sm:text-[40px]">Everything you need, nothing you have to decode.</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="card p-6"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" aria-hidden="true" /></span><h3 className="mt-4 text-lg">{title}</h3><p className="mt-2 text-[15px] text-muted">{text}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section id="privacy" className="scroll-mt-20 py-6">
        <div className="mx-auto max-w-[1200px] px-5">
          <div className="grid gap-10 overflow-hidden rounded-[28px] p-8 text-white md:grid-cols-[1fr_1fr] md:p-14" style={{ background: 'linear-gradient(150deg, #0a2c8f 0%, #0b5fe6 60%, #18b8f8 130%)' }}>
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">Privacy</p><h2 className="mt-3 text-[34px] text-white sm:text-[40px]">Read-only, encrypted, and yours to delete.</h2><p className="mt-4 text-white/85">We built Media Navigator to look, not touch. Here is exactly what that means.</p></div>
            <ul className="space-y-5">
              {[{ icon: Eye, t: 'Read-only', d: 'It can’t post, edit or delete anything on your accounts.' }, { icon: Lock, t: 'Encrypted access', d: 'Your access is encrypted on our server and never shown in your browser.' }, { icon: Trash2, t: 'Deletable', d: 'Disconnect any time, or delete your whole account from Settings.' }].map(({ icon: Icon, t, d }) => (
                <li key={t} className="flex gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15"><Icon className="h-5 w-5" aria-hidden="true" /></span><div><p className="font-semibold">{t}</p><p className="text-sm text-white/80">{d}</p></div></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 py-20">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-center text-[34px] sm:text-[40px]">Questions, answered.</h2>
          <div className="mt-10 divide-y divide-line rounded-2xl border border-line bg-surface">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group px-6 py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold text-ink">{q}<ChevronDown className="h-5 w-5 shrink-0 text-subtle transition-transform group-open:rotate-180" aria-hidden="true" /></summary><p className="mt-3 text-muted">{a}</p></details>
            ))}
          </div>
          <div className="mt-12 text-center"><LinkButton href="/sign-up" size="lg">Get started<ArrowRight className="h-5 w-5" aria-hidden="true" /></LinkButton></div>
        </div>
      </section>

      <footer className="border-t border-line bg-app py-10">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-5 px-5 text-sm text-muted sm:flex-row">
          <Wordmark />
          <nav aria-label="Legal" className="flex gap-6"><Link href="/terms" className="hover:text-ink">Terms</Link><Link href="/privacy" className="hover:text-ink">Privacy</Link></nav>
          <p>© {new Date().getFullYear()} Media Navigator. Platform names are trademarks of their owners.</p>
        </div>
      </footer>
    </div>
  );
}
