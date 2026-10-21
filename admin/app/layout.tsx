import type { Metadata } from 'next';
import { Providers } from '@/components/providers/providers';
import './globals.css';
export const metadata: Metadata = { title: 'Media Navigator · Administration', robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}
