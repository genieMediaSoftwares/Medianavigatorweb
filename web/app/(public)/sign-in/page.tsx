import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthLayout } from '@/components/auth/auth-layout';
import { SignInForm } from '@/components/auth/sign-in-form';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to see how your content is doing." footer={<>New here? <Link href="/sign-up" className="font-semibold text-brand-600 hover:underline">Create an account</Link></>}>
      <Suspense><SignInForm /></Suspense>
    </AuthLayout>
  );
}
