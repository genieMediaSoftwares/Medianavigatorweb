import { Wordmark } from '@/components/brand/logo';
import { getEnv } from '@/env';
export default function AdminEntry() {
  const adminUrl = getEnv().ADMIN_APP_URL ?? null; // validated in env.ts (https in production)
  return <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-6"><Wordmark href="/home" /><h1 className="text-3xl">Administration has moved</h1><p className="text-muted">Media Navigator administration runs as a separate application for the website and mobile app.</p>{adminUrl ? <a href={adminUrl} className="font-semibold text-brand-700 underline">Open the admin panel</a> : <p role="status">The separate admin address has not been configured. Set ADMIN_APP_URL on the website server.</p>}</main>;
}
