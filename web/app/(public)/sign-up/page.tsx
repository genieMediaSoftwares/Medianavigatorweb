import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/auth-layout';
import { SignUpForm } from '@/components/auth/sign-up-form';

export const metadata: Metadata = { title: 'Create your account' };

export default function SignUpPage() {
  return (
    <AuthLayout title="Create your account" subtitle="It takes a minute. You can connect your first account right after." footer={<>Already have an account? <Link href="/sign-in" className="font-semibold text-brand-600 hover:underline">Sign in</Link></>}>
      <SignUpForm />
    </AuthLayout>
  );
}
