import type { Metadata } from 'next';
import { ProfileView } from './ProfileView';

export const metadata: Metadata = { title: 'Profile settings' };

export default function ProfileSettingsPage() {
  return <ProfileView />;
}
