import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthLayout } from '@/components/auth/auth-layout';
import { ResetForm } from '@/components/auth/reset-form';

export const metadata: Metadata = { title: 'Choose a new password' };

export default function ResetPasswordPage() {
  return (
    <AuthLayout title="Choose a new password" subtitle="Pick something you haven’t used before." footer={<Link href="/sign-in" className="font-semibold text-brand-600 hover:underline">Back to sign in</Link>}>
      <Suspense><ResetForm /></Suspense>
    </AuthLayout>
  );
}
