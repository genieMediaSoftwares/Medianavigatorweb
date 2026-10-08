import Link from 'next/link';
import { BarChart3, CalendarDays, Clock, Lock, MessageSquareText, ShieldCheck, Trash2, Eye } from 'lucide-react';
import { buttonClass } from '@/components/ui/Button';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { PLATFORMS } from '@/lib/api/schemas';
import { PLATFORM_LABEL } from '@/lib/copy';

const STEPS = [
  { title: 'Connect', body: 'Link Instagram, Facebook, YouTube or LinkedIn. Access is read-only.' },
  { title: 'We compare', body: 'Each post is compared with your own usual results, not with strangers.' },
  { title: 'You act', body: 'You get clear next steps: what to repeat, what to fix and when to post.' },
];

const FEATURES = [
  { icon: BarChart3, title: 'Judged against your own history', body: 'A post is "doing well" when it beats your typical post on the same channel. No made-up industry averages.' },
  { icon: Clock, title: 'Best times to post', body: 'See which days and times have worked for you, with how many posts each answer is based on.' },
  { icon: MessageSquareText, title: 'Plain-language insights', body: 'Every number comes with one sentence that says what it means. When AI helps, we say so.' },
  { icon: CalendarDays, title: 'A simple planner', body: 'Turn ideas into a weekly plan. You publish yourself; we never post for you.' },
];

const FAQ = [
  { q: 'Can Media Navigator post or delete things on my accounts?', a: 'No. It only reads your posts and their results. It cannot publish, edit or delete anything.' },
  { q: 'Where do the numbers come from?', a: 'From the platforms themselves. When a platform does not share a number (for example, YouTube does not share reach), we say "Not available" instead of showing zero.' },
  { q: 'Is AI making things up about my content?', a: 'AI is only used to explain numbers we already measured, and every explanation is labelled. If AI is not available, you see the measured facts only.' },
  { q: 'Can I remove my data?', a: 'Yes. You can disconnect any account at any time, and delete your Media Navigator account and its data from Settings.' },
];

export default function LandingPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-tint px-3 py-1 text-sm font-semibold text-action">
          <Eye className="size-4" aria-hidden /> Read-only analytics for creators and small teams
        </p>
        <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight text-ink sm:text-6xl">
          Don&apos;t navigate your media. Let Media Navigator navigate it for you.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-muted">
          Connect your channels and find out, in plain language, what&apos;s working in your content, what to fix, and when to post.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/create-account" className={buttonClass('primary')}>Get started</Link>
          <Link href="/sign-in" className={buttonClass('secondary')}>Sign in</Link>
        </div>
        <ul className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3" aria-label="Supported platforms">
          {PLATFORMS.map((p) => (
            <li key={p} className="flex items-center gap-2 text-[15px] font-semibold text-ink-muted">
              <PlatformIcon platform={p} decorative className="size-7" />
              {PLATFORM_LABEL[p]}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-line bg-surface" aria-labelledby="how">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 id="how" className="font-display text-3xl font-semibold">How it works</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-[var(--radius-card)] border border-line bg-canvas p-6">
                <span className="grid size-10 place-items-center rounded-full bg-action font-bold text-on-action" aria-hidden>{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-ink-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="features">
        <h2 id="features" className="font-display text-3xl font-semibold">What you get</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
              <f.icon className="size-6 text-action" aria-hidden />
              <h3 className="mt-3 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-ink-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-tint" aria-labelledby="privacy">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <h2 id="privacy" className="font-display text-3xl font-semibold">Your accounts stay yours</h2>
            <p className="mt-3 text-ink-muted">Clear limits, so you always know what we can and can&apos;t do.</p>
          </div>
          <ul className="grid gap-4 md:col-span-2 sm:grid-cols-3">
            <li className="rounded-[var(--radius-card)] bg-surface p-5"><ShieldCheck className="size-6 text-action" aria-hidden /><p className="mt-2 font-semibold">Read-only</p><p className="text-sm text-ink-muted">We can&apos;t post, edit or delete.</p></li>
            <li className="rounded-[var(--radius-card)] bg-surface p-5"><Lock className="size-6 text-action" aria-hidden /><p className="mt-2 font-semibold">Encrypted</p><p className="text-sm text-ink-muted">Access keys are encrypted and never shown in your browser.</p></li>
            <li className="rounded-[var(--radius-card)] bg-surface p-5"><Trash2 className="size-6 text-action" aria-hidden /><p className="mt-2 font-semibold">Deletable</p><p className="text-sm text-ink-muted">Disconnect or delete your account at any time.</p></li>
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6" aria-labelledby="faq">
        <h2 id="faq" className="font-display text-3xl font-semibold">Questions</h2>
        <div className="mt-6 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-[var(--radius-card)] border border-line bg-surface p-5">
              <summary className="cursor-pointer list-none font-semibold marker:hidden">{f.q}</summary>
              <p className="mt-2 text-ink-muted">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/create-account" className={buttonClass('primary')}>Get started</Link>
        </div>
      </section>
    </>
  );
}
