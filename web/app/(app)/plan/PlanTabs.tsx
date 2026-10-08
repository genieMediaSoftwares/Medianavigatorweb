'use client';

import { usePathname } from 'next/navigation';
import { Tabs } from '@/components/ui/Tabs';

export function PlanTabs() {
  const path = usePathname();
  return (
    <Tabs
      label="Plan sections"
      items={[
        { href: '/plan', label: 'Ideas', active: path === '/plan' },
        { href: '/plan/planner', label: 'Planner', active: path === '/plan/planner' },
      ]}
    />
  );
}
