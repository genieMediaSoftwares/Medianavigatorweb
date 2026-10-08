'use client';

import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wordmark } from '@/components/brand/logo';
import { ADMIN_NAV, NAV, isActive, type NavItem } from '@/lib/nav';
import { cn } from '@/lib/utils';
import { AccountCard } from './account';

export function NavList({ isAdmin, collapsed, onNavigate }: { isAdmin: boolean; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items: NavItem[] = isAdmin ? [...NAV, ADMIN_NAV] : NAV;
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(item, pathname);
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={active ? 'page' : undefined} title={collapsed ? item.label : undefined}
            className={cn('relative flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors', collapsed && 'justify-center px-0',
              active ? 'bg-brand-600 text-white shadow-[0_6px_16px_rgba(11,95,230,.28)]' : 'text-muted hover:bg-brand-50 hover:text-ink')}>
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            {!collapsed && <span>{item.label}</span>}
            {collapsed && <span className="sr-only">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ isAdmin, collapsed, onToggle }: { isAdmin: boolean; collapsed: boolean; onToggle: () => void }) {
  return (
    <aside className={cn('fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex', collapsed ? 'w-[72px]' : 'w-[264px]')}>
      <div className={cn('flex h-[72px] shrink-0 items-center', collapsed ? 'justify-center' : 'px-6')}><Wordmark href="/home" collapsed={collapsed} /></div>
      <div className={cn('custom-scroll flex-1 overflow-y-auto py-2', collapsed ? 'px-3' : 'px-4')}><NavList isAdmin={isAdmin} collapsed={collapsed} /></div>
      <div className={cn('shrink-0 space-y-3 border-t border-line py-4', collapsed ? 'px-3' : 'px-4')}>
        <AccountCard collapsed={collapsed} />
        <button onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-subtle hover:bg-brand-50">
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" />Collapse</>}
        </button>
      </div>
    </aside>
  );
}
