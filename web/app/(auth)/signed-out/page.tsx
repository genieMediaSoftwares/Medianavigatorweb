import type { Metadata } from 'next';
import { LogOut } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';

export const metadata: Metadata = { title: "You've been signed out" };

export default function SignedOutPage() {
  return (
    <div className="text-center">
      <LogOut className="mx-auto size-10 text-action" aria-hidden />
      <h1 className="mt-3 font-display text-3xl font-semibold">You&apos;ve been signed out</h1>
      <p className="mt-2 text-ink-muted">
        Your session ended. This happens after a long time away, when you sign out on another device, or after a password change.
      </p>
      <ButtonLink href="/sign-in" className="mt-6">Sign in again</ButtonLink>
    </div>
  );
}
