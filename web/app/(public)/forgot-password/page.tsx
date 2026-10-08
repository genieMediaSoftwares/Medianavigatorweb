import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/auth-layout';
import { ForgotForm } from '@/components/auth/forgot-form';

export const metadata: Metadata = { title: 'Reset your password' };

export default function ForgotPasswordPage() {
  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter your email and we’ll send you a link to choose a new one." footer={<Link href="/sign-in" className="font-semibold text-brand-600 hover:underline">Back to sign in</Link>}>
      <ForgotForm />
    </AuthLayout>
  );
}
