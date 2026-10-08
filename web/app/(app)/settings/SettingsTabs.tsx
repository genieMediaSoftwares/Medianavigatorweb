'use client';

import { usePathname } from 'next/navigation';
import { Tabs } from '@/components/ui/Tabs';

export function SettingsTabs() {
  const path = usePathname();
  return (
    <Tabs
      label="Settings sections"
      items={[
        { href: '/settings', label: 'Profile', active: path === '/settings' },
        { href: '/settings/security', label: 'Security', active: path === '/settings/security' },
        { href: '/settings/files', label: 'Files', active: path === '/settings/files' },
        { href: '/settings/privacy', label: 'Privacy', active: path === '/settings/privacy' },
      ]}
    />
  );
}
