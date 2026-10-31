import { DocumentScreen } from '@/components/DocumentScreen';

export default function HelpScreen() {
  return (
    <DocumentScreen
      intro="Answers to common questions about Media Navigator."
      sections={[
        {
          title: 'Which accounts can I connect?',
          paragraphs: [
            'Instagram Business or Creator accounts, Facebook Pages you have a role on, YouTube channels you own or manage, and LinkedIn company pages you administer.',
            'Open Profile → Connected Accounts and choose a platform. Instagram connects with an access token from Meta Graph API Explorer; the other platforms open their own sign-in page.',
          ],
        },
        {
          title: 'Where do my numbers come from?',
          paragraphs: [
            'Every number is synced from the platform’s official API and calculated by Media Navigator from that data. Nothing is estimated.',
            '“Not available” means the platform did not provide that metric (for example, views for older posts or likes a creator has hidden). It is never shown as zero.',
            'The Home screen and account screens describe your latest 50 posts; Intelligence uses every synced post. The same formula over a different set of posts can give different averages.',
          ],
        },
        {
          title: 'How do I refresh my data?',
          paragraphs: [
            'Tap Sync now on an account screen or in Intelligence. A sync fetches your profile, your most recent content (up to 200 items on Instagram) and the metrics the platform returns.',
          ],
        },
        {
          title: 'How does the AI work?',
          paragraphs: [
            'Insights, post diagnoses and answers are written by Google Gemini from your account’s metrics and shortened captions. Gemini never receives your email, password or platform access tokens.',
            'Supporting numbers shown under an insight come from your synced data, not from the AI. AI explanations are hypotheses to test, not proven causes.',
          ],
        },
        {
          title: 'An account says “Reconnect”',
          paragraphs: [
            'The platform stopped accepting Media Navigator’s access, usually because a token expired or permissions were removed. Open the account and reconnect it; your synced history is kept.',
          ],
        },
        {
          title: 'Can I schedule posts?',
          paragraphs: ['The Planner helps you prepare ideas, plan dates and set reminders. Publish on the social platform, then link the synced post to your plan to review its results. Media Navigator does not publish to social platforms automatically.'],
        },
        {
          title: 'How do I remove my data?',
          paragraphs: [
            'Disconnecting an account deletes its stored access token and stops future imports; previously imported posts and analysis remain until you delete your account. Profile → Security → Delete account removes your profile, connections, imported content, analyses, plans and files (see Privacy for what is kept).',
          ],
        },
      ]}
    />
  );
}
