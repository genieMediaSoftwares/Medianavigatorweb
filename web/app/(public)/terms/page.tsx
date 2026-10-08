import type { Metadata } from 'next';
import { getEnv } from '@/env';
import { LegalPage } from '../legal';

export const metadata: Metadata = { title: 'Terms' };

export default function TermsPage() {
  const { operatorName, supportEmail } = getEnv();
  return (
    <LegalPage title="Terms of use" intro={<p>These terms describe what this Media Navigator service does and what you agree to when you use it. It is operated by {operatorName}.</p>}>
      <section>
        <h2>What the service does</h2>
        <p>Media Navigator connects to social accounts you choose (Instagram, Facebook, YouTube, LinkedIn), reads your posts and their results, and shows you summaries, comparisons with your own past posts, and suggestions.</p>
      </section>
      <section>
        <h2>Read-only access</h2>
        <p>The service only reads. It cannot publish, edit or delete anything on your social accounts. The planner is for your own scheduling; you publish yourself.</p>
      </section>
      <section>
        <h2>Your responsibilities</h2>
        <ul>
          <li>Only connect accounts you are allowed to manage.</li>
          <li>Keep your password private. You can sign out other devices from Settings at any time.</li>
          <li>Follow each platform&apos;s own terms.</li>
        </ul>
      </section>
      <section>
        <h2>About the numbers and suggestions</h2>
        <p>Numbers come from the platforms. When a platform does not provide a number, we show it as not available. Suggestions are based on your own history and may be wrong; AI-written explanations are always labelled as such. Nothing here guarantees results.</p>
      </section>
      <section>
        <h2>Ending your use</h2>
        <p>You can disconnect accounts and delete your Media Navigator account from Settings. Deleting your account removes your data as described in the Privacy page.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Questions about these terms: <a className="font-semibold text-action underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
      </section>
    </LegalPage>
  );
}
