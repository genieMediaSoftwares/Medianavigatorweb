import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers/providers';
import { THEME_INIT_SCRIPT } from '@/components/providers/theme';
import './globals.css';

const heading = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-heading', display: 'swap' });
const body = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Media Navigator', template: '%s · Media Navigator' },
  description: 'Connect your Instagram, Facebook, YouTube and LinkedIn accounts and see, in plain language, what is working, what to fix and when to post.',
};
export const viewport: Viewport = { themeColor: '#0b5fe6', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${heading.variable} ${body.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} /></head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
