import { CalendarCheck, LayoutGrid, Plug, Settings, Sparkles, House, ShieldCheck, type LucideIcon } from 'lucide-react';

export interface NavItem { href: string; label: string; icon: LucideIcon; match: string[]; group?: string }

/**
 * Six destinations in three groups. Related views live inside a page as tabs (Insights holds Overview, Key takeaways,
 * Formats and Best times; Posts holds All, What's working and Needs work).
 */
export const NAV: NavItem[] = [
  { href: '/home', label: 'Home', icon: House, match: ['/home'], group: 'Analyze' },
  { href: '/posts', label: 'Posts', icon: LayoutGrid, match: ['/posts'], group: 'Analyze' },
  { href: '/insights', label: 'Insights', icon: Sparkles, match: ['/insights', '/best-times'], group: 'Analyze' },
  { href: '/plan', label: 'Plan', icon: CalendarCheck, match: ['/plan'], group: 'Create' },
  { href: '/connections', label: 'Connections', icon: Plug, match: ['/connections'], group: 'Manage' },
  { href: '/settings', label: 'Settings', icon: Settings, match: ['/settings'], group: 'Manage' },
];
export const ADMIN_NAV: NavItem = { href: '/admin', label: 'Admin', icon: ShieldCheck, match: ['/admin'], group: 'Manage' };

export const isActive = (item: NavItem, pathname: string) => item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
export function titleFor(pathname: string): string {
  const all = [...NAV, ADMIN_NAV];
  return all.find((i) => isActive(i, pathname))?.label ?? (pathname.startsWith('/notifications') ? 'Notifications' : 'Media Navigator');
}
