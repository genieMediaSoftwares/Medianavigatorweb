'use client';

import { usePathname } from 'next/navigation';
import { Tabs } from '@/components/ui/Tabs';

export function InsightsTabs() {
  const path = usePathname();
  return (
    <Tabs
      label="Insights sections"
      items={[
        { href: '/insights', label: 'Overview', active: path === '/insights' },
        { href: '/insights/trends', label: 'Trends', active: path === '/insights/trends' },
        { href: '/insights/patterns', label: 'Patterns', active: path === '/insights/patterns' },
        { href: '/insights/ask', label: 'Ask', active: path === '/insights/ask' },
      ]}
    />
  );
}
