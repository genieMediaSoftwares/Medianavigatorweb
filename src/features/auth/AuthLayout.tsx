import React from 'react';
import { ArrowLeft, Compass, LineChart, ShieldCheck, Sparkles } from 'lucide-react';
import { BrandLogo } from '../../components/common/BrandLogo';
import { useMedia } from '../../app/providers/MediaContext';

const POINTS = [
  { icon: LineChart, title: 'See what actually works', body: 'Every post is compared with your own history, not a generic benchmark.' },
  { icon: Sparkles, title: 'Know what to do next', body: 'Clear recommendations, best posting times and ideas tied to your data.' },
  { icon: ShieldCheck, title: 'Read-only and private', body: 'We can’t post or delete anything. Access tokens are encrypted.' },
];

/** Two-column frame shared by sign-in and sign-up: form on the left, brand panel on the right (desktop only). */
export const AuthLayout: React.FC<{ title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }> = ({ title, subtitle, children, footer }) => {
  const { setAppView } = useMedia();
  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] bg-canvas">
      <div className="flex flex-col px-5 sm:px-10 py-6">
        <div className="flex items-center justify-between">
          <BrandLogo onClick={() => setAppView('landing')} />
          <button onClick={() => setAppView('landing')} className="btn btn-ghost btn-sm"><ArrowLeft className="w-4 h-4" />Back</button>
        </div>
        <main className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-[420px] animate-fade-up">
            <h1 className="font-display text-4xl sm:text-[44px] font-medium tracking-tight leading-[1.05]">{title}</h1>
            <p className="mt-3 text-[17px] text-body">{subtitle}</p>
            <div className="mt-8">{children}</div>
            <div className="mt-8 text-center text-[15px] text-body">{footer}</div>
          </div>
        </main>
      </div>

      <aside className="hidden lg:flex relative overflow-hidden bg-ink text-white p-14 flex-col justify-between" aria-hidden="true">
        <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 w-[26rem] h-[26rem] rounded-full bg-brand-700/40 blur-3xl" />
        <Compass className="absolute right-[-3rem] bottom-[-3rem] w-[26rem] h-[26rem] text-white/[0.04]" strokeWidth={0.6} />
        <div className="relative">
          <p className="font-display text-5xl leading-[1.08] tracking-tight">Know what to post <span className="text-brand-400">before you post it.</span></p>
        </div>
        <ul className="relative space-y-6 max-w-md">
          {POINTS.map((p) => (
            <li key={p.title} className="flex gap-4">
              <span className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0"><p.icon className="w-5 h-5 text-brand-300" /></span>
              <div><div className="font-semibold">{p.title}</div><div className="text-sm text-white/65 mt-0.5 leading-relaxed">{p.body}</div></div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
};
