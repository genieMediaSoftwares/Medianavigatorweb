import type { Metadata } from 'next';
import { SecurityView } from './SecurityView';

export const metadata: Metadata = { title: 'Security settings' };

export default function SecuritySettingsPage() {
  return <SecurityView />;
}
