import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalLayout } from '@/components/legal/legal-layout';

export const metadata: Metadata = { title: 'Terms' };

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of use" updated="October 2026">
      <p>These terms explain how you may use Media Navigator. They are written in plain words. By creating an account you agree to them. Please read them together with our <Link href="/privacy">Privacy Policy</Link>.</p>

      <h2>What Media Navigator does</h2>
      <p>Media Navigator connects to the social accounts you choose (Instagram, Facebook, YouTube and LinkedIn), reads the public numbers of your posts, and explains in plain language what seems to be working, what to improve and when your posts tend to do best.</p>

      <h2>Read-only access</h2>
      <p>Media Navigator only reads. It cannot post, edit or delete anything on your social accounts, and it never will through your connection. You can disconnect an account at any time.</p>

      <h2>Your account</h2>
      <ul>
        <li>Give us accurate details and keep your password private. You are responsible for what happens under your account.</li>
        <li>Only connect accounts you own or are allowed to manage.</li>
        <li>You can sign out of any device from Settings, and delete your account at any time from Settings, Privacy.</li>
      </ul>

      <h2>Using the service fairly</h2>
      <ul>
        <li>Don’t try to break, overload or probe the service, or access another person’s data.</li>
        <li>Don’t use it to break the rules of the platforms you connect.</li>
        <li>We may limit how often requests can be made, and may pause accounts that put others at risk.</li>
      </ul>

      <h2>About the numbers and advice</h2>
      <p>Everything you see comes from the numbers the platforms share with us. Some numbers may be missing or delayed, and we say so instead of guessing. Explanations and suggestions describe patterns in your past posts. They are not guarantees of future results.</p>

      <h2>Changes and ending the service</h2>
      <p>We may improve or change the service and these terms. If a change matters, we will tell you in the app. If you delete your account, your data is removed as described in the Privacy Policy.</p>

      <h2>Contact</h2>
      <p>The operator’s name and contact details are shown in the box at the top of this page.</p>
    </LegalLayout>
  );
}
