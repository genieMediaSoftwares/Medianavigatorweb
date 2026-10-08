import { CalendarCheck, Clock, LayoutGrid, Plug, Settings, Sparkles, House, ShieldCheck, type LucideIcon } from 'lucide-react';

export interface NavItem { href: string; label: string; icon: LucideIcon; match: string[] }

/** The whole navigation: seven items. Everything else lives inside a page as a tab. */
export const NAV: NavItem[] = [
  { href: '/home', label: 'Home', icon: House, match: ['/home'] },
  { href: '/posts', label: 'Posts', icon: LayoutGrid, match: ['/posts'] },
  { href: '/insights', label: 'Insights', icon: Sparkles, match: ['/insights'] },
  { href: '/best-times', label: 'Best times', icon: Clock, match: ['/best-times'] },
  { href: '/plan', label: 'Plan', icon: CalendarCheck, match: ['/plan'] },
  { href: '/connections', label: 'Connections', icon: Plug, match: ['/connections'] },
  { href: '/settings', label: 'Settings', icon: Settings, match: ['/settings'] },
];
export const ADMIN_NAV: NavItem = { href: '/admin', label: 'Admin', icon: ShieldCheck, match: ['/admin'] };

export const isActive = (item: NavItem, pathname: string) => item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
export function titleFor(pathname: string): string {
  const all = [...NAV, ADMIN_NAV];
  return all.find((i) => isActive(i, pathname))?.label ?? (pathname.startsWith('/notifications') ? 'Notifications' : 'Media Navigator');
}
