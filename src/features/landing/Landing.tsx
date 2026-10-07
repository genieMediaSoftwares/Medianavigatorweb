import React, { useState } from 'react';
import { ArrowRight, BarChart3, CalendarDays, ChevronDown, Clock, FileText, Lock, Menu, Sparkles, Trophy, X, Eye, EyeOff, Trash2 } from 'lucide-react';
import { BrandLogo } from '../../components/common/BrandLogo';
import { useMedia } from '../../app/providers/MediaContext';
import { InstagramLogo, YouTubeLogo, FacebookLogo, LinkedInLogo } from '../../components/common/PlatformLogos';

const FEATURES = [
  { icon: BarChart3, title: 'Judged against your own history', body: 'Each post is labelled top, typical or below usual by comparing it with your other posts on that platform, so one viral hit doesn’t skew the picture.' },
  { icon: Trophy, title: 'Why a post worked', body: 'Open any post to see how it compares and, when you want it, an AI explanation clearly marked as interpretation.' },
  { icon: Clock, title: 'Your best times to post', body: 'A day-and-hour map built from your own posts, in your timezone, with the number of posts behind every cell.' },
  { icon: Sparkles, title: 'Answers from your data', body: 'Ask a question in plain language. Answers use your numbers, and say so plainly when AI isn’t involved.' },
  { icon: CalendarDays, title: 'A planner that knows your results', body: 'Turn a recommendation into a scheduled idea in one click, using the time slot that has worked for you.' },
  { icon: FileText, title: 'Reports you can share', body: 'Generate a clean summary for any period and save it as a PDF for a client or your team.' },
];

const STEPS = [
  { n: '1', title: 'Connect', body: 'Sign in with Instagram, YouTube, Facebook or LinkedIn. Access is read-only.' },
  { n: '2', title: 'We import and compare', body: 'Your posts and their numbers are imported and compared with your own baseline.' },
  { n: '3', title: 'You act on it', body: 'See what to repeat, what to fix, and when to post next.' },
];

const PRINCIPLES = [
  { icon: Eye, title: 'Read-only access', body: 'We can’t post, edit or delete anything on your accounts.' },
  { icon: Lock, title: 'Tokens are encrypted', body: 'Stored encrypted on our server, never shown again, removed when you disconnect.' },
  { icon: EyeOff, title: 'No invented numbers', body: 'If a platform doesn’t provide a metric, we show it as unavailable instead of guessing.' },
  { icon: Trash2, title: 'Delete it all', body: 'Delete your account and your imported posts, results and tokens are removed.' },
];

const FAQ = [
  { q: 'What do I need to connect an account?', a: 'A professional or business account for Instagram, a channel for YouTube, a Page for Facebook, and a company page for LinkedIn. Sign in with the platform, or paste an access token if you prefer.' },
  { q: 'Which numbers will I see?', a: 'Whatever each platform makes available: views, likes, comments and, where granted, reach and shares. Metrics a platform doesn’t provide are shown as unavailable. Stories and Live are not included.' },
  { q: 'Is the AI making things up?', a: 'The numbers always come from your data. The AI only interprets them, every answer says whether AI was used, and if it’s unavailable you still get the measured facts.' },
  { q: 'How often does it update?', a: 'Each connection syncs in the background on a schedule, and you can sync any time. Every channel shows when it last synced.' },
];

export const Landing: React.FC = () => {
  const { setAppView } = useMedia();
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState<number | null>(0);
  const links = [['How it works', '#how'], ['Features', '#features'], ['Privacy', '#privacy'], ['FAQ', '#faq']];

  return (
    <div className="min-h-screen bg-canvas text-ink overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-canvas/85 backdrop-blur-md border-b border-line">
        <div className="max-w-6xl mx-auto px-5 h-[72px] flex items-center justify-between">
          <BrandLogo />
          <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-body" aria-label="Sections">{links.map(([l, h]) => <a key={h} href={h} className="hover:text-ink">{l}</a>)}</nav>
          <div className="hidden md:flex items-center gap-2"><button onClick={() => setAppView('signin')} className="btn btn-ghost">Sign in</button><button onClick={() => setAppView('signup')} className="btn btn-primary">Get started<ArrowRight className="w-4 h-4" /></button></div>
          <button className="md:hidden p-2 -mr-2 rounded-xl hover:bg-canvas-soft" onClick={() => setMenu((v) => !v)} aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu}>{menu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button>
        </div>
        {menu && (
          <div className="md:hidden border-t border-line bg-white px-5 py-4 space-y-1 animate-fade-up">
            {links.map(([l, h]) => <a key={h} href={h} onClick={() => setMenu(false)} className="block py-3 text-[17px] font-medium">{l}</a>)}
            <div className="pt-3 flex gap-2"><button onClick={() => setAppView('signin')} className="btn btn-secondary flex-1">Sign in</button><button onClick={() => setAppView('signup')} className="btn btn-primary flex-1">Get started</button></div>
          </div>
        )}
      </header>

      <section className="relative">
        <div aria-hidden="true" className="absolute inset-0 bg-hero-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div aria-hidden="true" className="absolute -top-40 left-1/2 -translate-x-1/2 w-[60rem] h-[30rem] rounded-full bg-brand-200/40 blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-5 pt-16 pb-12 md:pt-24 md:pb-20 grid lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
          <div>
            <span className="badge badge-brand !text-sm !py-1">For creators, brands and agencies</span>
            <h1 className="mt-5 font-display text-[44px] sm:text-6xl lg:text-[68px] font-medium tracking-tight leading-[1.02]">Know what to post <span className="text-brand-600 italic">before</span> you post it.</h1>
            <p className="mt-6 text-lg sm:text-xl text-body leading-relaxed max-w-xl">Media Navigator connects your Instagram, YouTube, Facebook and LinkedIn, compares every post with your own results, and tells you what to repeat, what to fix and when to publish.</p>
            <div className="mt-8 flex flex-wrap gap-3"><button onClick={() => setAppView('signup')} className="btn btn-primary btn-lg">Get started<ArrowRight className="w-5 h-5" /></button><a href="#how" className="btn btn-secondary btn-lg">See how it works</a></div>
            <div className="mt-10 flex items-center gap-5 text-sm text-muted"><span>Works with</span><span className="flex items-center gap-4"><InstagramLogo size="md" /><YouTubeLogo size="md" /><FacebookLogo size="md" /><LinkedInLogo size="md" /></span></div>
          </div>

          {/* Illustration: a stylised dashboard. Decorative, not real data. */}
          <div className="relative" aria-hidden="true">
            <div className="card p-5 shadow-pop rotate-[1.2deg]">
              <div className="flex items-center justify-between"><div className="h-3 w-24 rounded-full bg-line" /><span className="badge badge-brand">Example</span></div>
              <div className="mt-5 grid grid-cols-3 gap-3">{[0, 1, 2].map((i) => <div key={i} className="rounded-xl bg-canvas p-3"><div className="h-2 w-10 rounded-full bg-line" /><div className="mt-3 h-6 w-16 rounded-md bg-ink/10" /></div>)}</div>
              <div className="mt-5 flex items-end gap-2 h-32">{[40, 62, 35, 78, 55, 92, 48, 70, 60, 85].map((h, i) => <div key={i} className={`flex-1 rounded-t-md ${i === 5 ? 'bg-brand-600' : 'bg-brand-200'}`} style={{ height: `${h}%` }} />)}</div>
              <div className="mt-5 space-y-2.5">{[0, 1].map((i) => <div key={i} className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-brand-100" /><div className="flex-1 space-y-1.5"><div className="h-2.5 w-3/4 rounded-full bg-line" /><div className="h-2 w-1/2 rounded-full bg-canvas-soft" /></div><span className={`badge ${i === 0 ? 'badge-success' : 'badge-warning'}`}>{i === 0 ? 'Top' : 'Below usual'}</span></div>)}</div>
            </div>
            <div className="absolute -left-4 -bottom-6 card px-4 py-3 shadow-pop -rotate-2 flex items-center gap-3"><span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center"><Clock className="w-5 h-5" /></span><div><div className="text-xs text-muted">Best time to post</div><div className="text-sm font-bold">Your strongest window</div></div></div>
          </div>
        </div>
      </section>

      <section id="how" className="py-20 md:py-24 border-y border-line bg-white scroll-mt-20">
        <div className="max-w-6xl mx-auto px-5">
          <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight max-w-2xl">From connected account to clear next step.</h2>
          <ol className="mt-12 grid md:grid-cols-3 gap-6">{STEPS.map((s) => (
            <li key={s.n} className="relative rounded-2xl bg-canvas p-7 border border-line"><span className="font-display text-6xl text-brand-300/80 leading-none">{s.n}</span><h3 className="mt-4 text-xl font-bold">{s.title}</h3><p className="mt-2 text-body leading-relaxed">{s.body}</p></li>
          ))}</ol>
        </div>
      </section>

      <section id="features" className="py-20 md:py-24 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-5">
          <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight max-w-2xl">Everything you need, nothing you have to decode.</h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{FEATURES.map((f) => (
            <article key={f.title} className="card card-interactive p-6"><span className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center"><f.icon className="w-5 h-5" /></span><h3 className="mt-5 text-lg font-bold leading-snug">{f.title}</h3><p className="mt-2 text-body leading-relaxed">{f.body}</p></article>
          ))}</div>
        </div>
      </section>

      <section id="privacy" className="py-20 md:py-24 bg-ink text-white scroll-mt-20">
        <div className="max-w-6xl mx-auto px-5">
          <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight max-w-2xl">Honest about your data, and with your data.</h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">{PRINCIPLES.map((p) => (
            <div key={p.title}><span className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center"><p.icon className="w-5 h-5 text-brand-300" /></span><h3 className="mt-4 font-bold">{p.title}</h3><p className="mt-1.5 text-white/65 leading-relaxed text-[15px]">{p.body}</p></div>
          ))}</div>
        </div>
      </section>

      <section id="faq" className="py-20 md:py-24 scroll-mt-20">
        <div className="max-w-3xl mx-auto px-5">
          <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight">Questions</h2>
          <div className="mt-10 divide-y divide-line border-y border-line">{FAQ.map((f, i) => (
            <div key={f.q}><button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="w-full py-5 flex items-center justify-between gap-4 text-left"><span className="text-lg font-semibold">{f.q}</span><ChevronDown className={`w-5 h-5 text-muted shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} /></button>{open === i && <p className="pb-6 -mt-1 text-body leading-relaxed animate-fade-up">{f.a}</p>}</div>
          ))}</div>
        </div>
      </section>

      <section className="px-5 pb-20">
        <div className="max-w-6xl mx-auto rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 text-white px-8 py-14 md:py-20 text-center relative overflow-hidden">
          <div aria-hidden="true" className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
          <h2 className="relative font-display text-4xl md:text-6xl font-medium tracking-tight leading-[1.05]">See your content clearly.</h2>
          <p className="relative mt-4 text-lg text-white/85 max-w-xl mx-auto">Connect an account and get your first insights in minutes.</p>
          <button onClick={() => setAppView('signup')} className="relative btn btn-lg mt-8 bg-white text-brand-700 hover:bg-brand-50">Get started<ArrowRight className="w-5 h-5" /></button>
        </div>
      </section>

      <footer className="border-t border-line py-10">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted"><BrandLogo /><div className="flex flex-col sm:items-end gap-1 text-center sm:text-right"><p className="flex gap-4 justify-center"><button onClick={() => setAppView('terms')} className="hover:text-ink underline">Terms</button><button onClick={() => setAppView('privacy')} className="hover:text-ink underline">Privacy</button></p><p>© {new Date().getFullYear()} Media Navigator. Instagram, YouTube, Facebook and LinkedIn are trademarks of their owners.</p></div></div>
      </footer>
    </div>
  );
};
