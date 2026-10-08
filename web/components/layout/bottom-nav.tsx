'use client';

import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Drawer } from '@/components/ui/dialog';
import { ADMIN_NAV, NAV, isActive } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { AccountCard } from './account';
import { NavList } from './sidebar';

/** Phones: the first four destinations plus "More" for the rest. */
export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const primary = NAV.slice(0, 4);
  const rest = [...NAV.slice(4), ...(isAdmin ? [ADMIN_NAV] : [])];
  const moreActive = rest.some((i) => isActive(i, pathname));
  const tab = 'flex h-full flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold';
  return (
    <>
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 flex h-16 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        {primary.map((item) => {
          const active = isActive(item, pathname);
          const Icon = item.icon;
          return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={cn(tab, active ? 'text-brand-600' : 'text-muted')}><Icon className="h-6 w-6" aria-hidden="true" />{item.label}</Link>;
        })}
        <button onClick={() => setMore(true)} aria-haspopup="dialog" className={cn(tab, moreActive ? 'text-brand-600' : 'text-muted')}><MoreHorizontal className="h-6 w-6" aria-hidden="true" />More</button>
      </nav>
      <Drawer open={more} onOpenChange={setMore} title="Menu">
        <div className="space-y-6"><NavList isAdmin={isAdmin} onNavigate={() => setMore(false)} /><AccountCard /></div>
      </Drawer>
    </>
  );
}
