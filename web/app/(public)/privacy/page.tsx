import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalLayout } from '@/components/legal/legal-layout';

export const metadata: Metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy policy" updated="October 2026">
      <p>This page says, in plain words, what Media Navigator keeps about you and why. See also our <Link href="/terms">Terms of use</Link>.</p>

      <h2>What we store</h2>
      <ul>
        <li><strong>Account details:</strong> your email, name, optional organization, account type and time zone, and a protected form of your password (never the password itself).</li>
        <li><strong>Connected accounts:</strong> the name and handle of each account you connect.</li>
        <li><strong>Posts’ public numbers:</strong> titles, captions, dates and the figures the platform shares, such as views, likes and comments.</li>
        <li><strong>Access keys:</strong> the permission each platform gives us to read your account. They are stored encrypted and deleted when you disconnect.</li>
        <li><strong>Sessions:</strong> the devices you’re signed in on, so you can sign any of them out.</li>
        <li><strong>Notes, plans and files</strong> you add yourself.</li>
      </ul>

      <h2>Read-only</h2>
      <p>Media Navigator cannot post, edit or delete anything on your social accounts.</p>

      <h2>AI explanations</h2>
      <p>Only if the owner of the service has switched on an AI provider, the text and public numbers of the posts being analysed may be sent to that provider to write an explanation. Passwords and access keys are never sent. If AI is not switched on, nothing is sent and you see measured facts only.</p>

      <h2>What we never do</h2>
      <ul>
        <li>We don’t sell your data or share it with advertisers.</li>
        <li>We don’t post, edit or delete on your behalf.</li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li>Disconnect any account at any time. This deletes the stored access key for it.</li>
        <li>Sign out of one or all devices in <Link href="/settings?tab=security">Settings, Security</Link>.</li>
        <li>Delete your account and everything we hold about you in <Link href="/settings?tab=privacy">Settings, Privacy</Link>.</li>
      </ul>

      <h2>Contact</h2>
      <p>The operator’s name and contact details are shown in the box at the top of this page.</p>
    </LegalLayout>
  );
}
