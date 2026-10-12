import { CalendarCheck, Compass, LayoutGrid, Plug, Settings, Sparkles, House, ShieldCheck, Lightbulb, Layers, type LucideIcon } from 'lucide-react';

export interface NavItem { href: string; label: string; icon: LucideIcon; match: string[] }
export interface NavGroup { label: string; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  { label: 'Core intelligence', items: [
    { href: '/home', label: 'Overview', icon: House, match: ['/home'] },
    { href: '/posts', label: 'Posts', icon: LayoutGrid, match: ['/posts'] },
    { href: '/insights', label: 'AI Intelligence', icon: Sparkles, match: ['/insights'] },
  ] },
  { label: 'Strategy & discovery', items: [
    { href: '/trends', label: 'Trends & ideas', icon: Lightbulb, match: ['/trends'] },
    { href: '/strategy', label: 'Posting strategy', icon: Compass, match: ['/strategy', '/best-times'] },
    { href: '/patterns', label: 'Pattern analysis', icon: Layers, match: ['/patterns'] },
    { href: '/plan', label: 'Plan', icon: CalendarCheck, match: ['/plan'] },
  ] },
  { label: 'Configuration', items: [
    { href: '/connections', label: 'Connections', icon: Plug, match: ['/connections'] },
    { href: '/settings', label: 'Settings', icon: Settings, match: ['/settings'] },
  ] },
];
export const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
export const ADMIN_NAV: NavItem = { href: '/admin', label: 'Admin panel', icon: ShieldCheck, match: ['/admin'] };

export const isActive = (item: NavItem, pathname: string) => item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
export function titleFor(pathname: string): string {
  const all = [...NAV, ADMIN_NAV];
  return all.find((i) => isActive(i, pathname))?.label ?? (pathname.startsWith('/notifications') ? 'Notifications' : 'Media Navigator');
}
