import { Compass } from 'lucide-react';
import { LinkButton } from '@/components/ui/button';
import { Wordmark } from '@/components/brand/logo';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-app px-4 py-12 text-center">
      <Wordmark className="mb-10" />
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Compass className="h-8 w-8" aria-hidden="true" /></div>
      <h1 className="text-[28px] sm:text-[32px]">We couldn’t find that page</h1>
      <p className="mt-2 max-w-md text-[15px] text-muted">The link may be old or mistyped. Let’s get you back on course.</p>
      <LinkButton href="/home" className="mt-8">Go to Home</LinkButton>
    </main>
  );
}
