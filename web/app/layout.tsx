import type { Metadata, Viewport } from 'next';
import { Newsreader, Plus_Jakarta_Sans } from 'next/font/google';
import { Providers } from '@/components/providers/Providers';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ variable: '--font-jakarta', subsets: ['latin'], display: 'swap' });
const newsreader = Newsreader({ variable: '--font-newsreader', subsets: ['latin'], display: 'swap', style: ['normal', 'italic'] });

export const metadata: Metadata = {
  title: { default: 'Media Navigator', template: '%s · Media Navigator' },
  description: 'Connect Instagram, Facebook, YouTube and LinkedIn and see, in plain language, what is working, what to fix and when to post.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf7f2' },
    { media: '(prefers-color-scheme: dark)', color: '#17110d' },
  ],
};

/** Applies the saved theme before first paint so there is no flash. Reads only a per-device preference. */
const themeScript = `try{var t=localStorage.getItem('mn-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${newsreader.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
