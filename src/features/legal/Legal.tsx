import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useMedia } from '../../app/providers/MediaContext';
import { BrandLogo } from '../../components/common/BrandLogo';

type Doc = { title: string; updated: string; intro: string; sections: { h: string; p: string[] }[] };

const PRIVACY: Doc = {
  title: 'Privacy Policy', updated: 'October 2026',
  intro: 'This page describes what Media Navigator collects, why, and how you stay in control. It describes how the product actually behaves today.',
  sections: [
    { h: 'What we collect', p: [
      'Account details you give us: your email address, name, optional organization and account type, and your time zone. Your password is stored only as a salted hash.',
      'When you connect Instagram, Facebook, YouTube or LinkedIn: the posts and public performance numbers those platforms return for the account you connect (for example views, likes, comments, publish times and thumbnails), plus the account name and follower count.',
      'Technical data needed to run the service: sign-in sessions (including device and IP address), request logs, and an audit log of security-relevant actions.',
    ] },
    { h: 'How we use it', p: [
      'To show you analytics about your own content, suggest posting times, and write plain-language insights. We do not sell your data and we do not use it for advertising.',
      'If AI analysis is enabled, we send Google’s Gemini model the measured numbers and the text of the specific post being analysed. We never send your passwords, access tokens or other credentials.',
    ] },
    { h: 'Access to your social accounts', p: [
      'We request read-only permissions. Media Navigator cannot post, edit or delete anything on your accounts.',
      'Access tokens are encrypted before they are stored and are only decrypted on our server when a sync runs. They are never sent to your browser. Disconnecting an account deletes its stored tokens.',
    ] },
    { h: 'Storage and sharing', p: [
      'Data is stored in MongoDB, and uploaded files in Cloudflare R2. Emails, if enabled, are sent through the configured mail provider. These providers process data on our behalf.',
      'Your browser keeps your sign-in tokens in local storage so you stay signed in. We do not use advertising or cross-site tracking cookies.',
    ] },
    { h: 'Your choices', p: [
      'You can disconnect any account at any time in Connections. You can see and sign out your devices in Settings.',
      'You can delete your account in Settings. This removes your profile, connected accounts, posts, analytics, planner items, notifications and files. Audit entries that record security events may be kept in a form that does not include your content.',
    ] },
    { h: 'Questions', p: ['Contact the operator of this Media Navigator service for privacy requests, including access or deletion that you cannot do yourself in the app.'] },
  ],
};

const TERMS: Doc = {
  title: 'Terms of Service', updated: 'October 2026',
  intro: 'By creating an account you agree to these terms.',
  sections: [
    { h: 'The service', p: ['Media Navigator analyses the performance of social media accounts that you connect, and shows insights and suggestions. Numbers come from the platforms and may be incomplete or delayed; some metrics are not available for every account or post type.'] },
    { h: 'Your account', p: ['You are responsible for activity under your account and for keeping your password secure. You must only connect accounts you own or are authorised to manage, and your use must follow each platform’s own terms.'] },
    { h: 'Acceptable use', p: ['Do not attempt to access other users’ data, disrupt the service, probe or bypass its security, or use it to break the law or any platform’s rules. We may suspend accounts that do.'] },
    { h: 'Insights are guidance, not guarantees', p: ['Suggestions, best times and AI-written interpretations describe patterns in your past posts. They do not predict results, and you decide what to publish.'] },
    { h: 'Your content and data', p: ['You keep ownership of your content and data. You give us permission to process it to provide the service, as described in the Privacy Policy.'] },
    { h: 'Availability and liability', p: ['The service depends on third-party platforms and can change or be unavailable. It is provided as is, and to the extent the law allows we are not liable for indirect losses.'] },
    { h: 'Ending your use', p: ['You can stop at any time by deleting your account in Settings. We can end or restrict access if these terms are broken.'] },
  ],
};

export const Legal: React.FC<{ doc: 'terms' | 'privacy' }> = ({ doc }) => {
  const { setAppView } = useMedia();
  const d = doc === 'terms' ? TERMS : PRIVACY;
  const back = () => { let from = ''; try { from = localStorage.getItem('mn:legal-from') ?? ''; localStorage.removeItem('mn:legal-from'); } catch { /* ignore */ } setAppView(from === 'signup' ? 'signup' : 'landing'); };
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface"><div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between"><BrandLogo /><button onClick={back} className="btn btn-secondary btn-sm"><ArrowLeft className="w-4 h-4" />Back</button></div></header>
      <main className="max-w-3xl mx-auto px-5 py-12">
        <h1 className="font-display text-4xl font-medium tracking-tight">{d.title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated {d.updated}</p>
        <p className="mt-6 text-[17px] text-body leading-relaxed">{d.intro}</p>
        {d.sections.map((s) => (
          <section key={s.h} className="mt-9"><h2 className="text-xl font-bold tracking-tight">{s.h}</h2>{s.p.map((t) => <p key={t} className="mt-3 text-body leading-relaxed">{t}</p>)}</section>
        ))}
        <p className="mt-12 text-sm text-muted">{doc === 'terms' ? <button className="underline" onClick={() => setAppView('privacy')}>Read the Privacy Policy</button> : <button className="underline" onClick={() => setAppView('terms')}>Read the Terms of Service</button>}</p>
      </main>
    </div>
  );
};
