import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalLayout } from '@/components/legal/legal-layout';

export const metadata: Metadata = { title: 'Data deletion' };

export default function DataDeletionPage() {
  return (
    <LegalLayout title="Delete your data" updated="October 2026">
      <p>You can remove any connected Instagram, Facebook, YouTube or LinkedIn account, or delete your Media Navigator account from the website or mobile app.</p>
      <h2>Stop access to a social account</h2>
      <p>Sign in, open <Link href="/connections">Connections</Link>, and disconnect the account. This removes its stored access token and stops future imports. Previously imported posts and analysis remain until you delete your Media Navigator account.</p>
      <h2>Delete your Media Navigator account</h2>
      <ol className="list-decimal space-y-2 pl-6">
        <li><Link href="/sign-in">Sign in to Media Navigator</Link>.</li>
        <li>Open <Link href="/settings?tab=privacy">Settings → Privacy</Link>.</li>
        <li>Choose Delete my account, enter your password and type DELETE, then confirm.</li>
      </ol>
      <p>In the Android or iOS app, open Profile → Security → Delete account, enter your password and confirm.</p>
      <p>This removes your connected accounts, stored access tokens, imported posts, analytics, saved AI analyses, profile, plans, notifications and uploaded files, and signs you out everywhere. If file storage is unavailable, file removal is retried automatically. An anonymized account record, administrative audit records and credit-adjustment records remain for accountability. Deletion cannot be undone.</p>
      <p>This does not delete posts from your social platforms. See our <Link href="/privacy">privacy policy</Link> for more information.</p>
    </LegalLayout>
  );
}
