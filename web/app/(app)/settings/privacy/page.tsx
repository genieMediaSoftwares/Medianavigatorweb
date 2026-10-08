import type { Metadata } from 'next';
import { PrivacyView } from './PrivacyView';

export const metadata: Metadata = { title: 'Privacy settings' };

export default function PrivacySettingsPage() {
  return <PrivacyView />;
}
