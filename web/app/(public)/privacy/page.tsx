import type { Metadata } from 'next';
import { getEnv } from '@/env';
import { LegalPage } from '../legal';

export const metadata: Metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  const { operatorName, supportEmail } = getEnv();
  return (
    <LegalPage title="Privacy" intro={<p>What this Media Navigator service stores, why, and how to remove it. It is operated by {operatorName}.</p>}>
      <section>
        <h2>What we store</h2>
        <ul>
          <li>Your account: email address, name, organization and account type (if you add them), time zone, and a password hash (never the password itself).</li>
          <li>Signed-in devices: browser description and network address, so you can see and sign out each device.</li>
          <li>For each connected account: the account name, follower and post counts the platform reports, and your posts&apos; titles, captions, publish dates and results.</li>
          <li>Daily snapshots of your totals, used for charts over time.</li>
          <li>Files you upload in Settings, if file storage is enabled.</li>
        </ul>
      </section>
      <section>
        <h2>Access to your social accounts</h2>
        <p>Access is read-only. The access keys platforms give us are encrypted before they are stored and are never sent to your browser. Disconnecting an account deletes its saved access immediately; past results stay until you delete your account.</p>
      </section>
      <section>
        <h2>What is sent to the AI provider</h2>
        <p>When AI explanations are enabled, the numbers we measured and calculated, plus post titles and captions (shortened), are sent to the AI provider to write an explanation. Access keys, passwords and your email address are never sent. Every AI explanation is labelled; when AI is not available you see measured facts only.</p>
      </section>
      <section>
        <h2>Your rights</h2>
        <ul>
          <li>See and change your profile in Settings.</li>
          <li>Disconnect any social account at any time.</li>
          <li>Delete your Media Navigator account in Settings → Privacy. This removes your connections, posts, results, notifications, files and plans.</li>
        </ul>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Privacy questions or requests: <a className="font-semibold text-action underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
      </section>
    </LegalPage>
  );
}
