import type { Metadata } from 'next';
import { getEnv } from '@/env';
import { ForgotForm } from './ForgotForm';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return <ForgotForm supportEmail={getEnv().supportEmail} />;
}
