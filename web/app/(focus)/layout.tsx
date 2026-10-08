import { Logo } from '@/components/layout/Logo';
import { SyncProvider } from '@/components/providers/AppContext';

export default function FocusLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="min-h-dvh px-4 py-8">
      <div className="mx-auto mb-8 flex max-w-3xl justify-center"><Logo /></div>
      <main id="main" className="mx-auto max-w-3xl">
        <SyncProvider>{children}</SyncProvider>
      </main>
    </div>
  );
}
