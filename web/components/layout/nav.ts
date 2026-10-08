import { Home, LayoutGrid, LineChart, Clock, CalendarDays, Link2, Settings, Shield, Bell, type LucideIcon } from 'lucide-react';

export interface NavItem { href: string; label: string; icon: LucideIcon; match: string }

/** Seven items at most. Everything else lives inside a page as a tab. */
export const NAV: NavItem[] = [
  { href: '/home', label: 'Home', icon: Home, match: '/home' },
  { href: '/posts', label: 'Posts', icon: LayoutGrid, match: '/posts' },
  { href: '/insights', label: 'Insights', icon: LineChart, match: '/insights' },
  { href: '/best-times', label: 'Best times', icon: Clock, match: '/best-times' },
  { href: '/plan', label: 'Plan', icon: CalendarDays, match: '/plan' },
  { href: '/connections', label: 'Connections', icon: Link2, match: '/connections' },
  { href: '/settings', label: 'Settings', icon: Settings, match: '/settings' },
];

export const ADMIN_NAV: NavItem = { href: '/admin', label: 'Admin', icon: Shield, match: '/admin' };
export const NOTIFICATIONS_NAV: NavItem = { href: '/notifications', label: 'Notifications', icon: Bell, match: '/notifications' };

export const isActive = (pathname: string, match: string) => pathname === match || pathname.startsWith(`${match}/`);

export function pageTitle(pathname: string): string {
  const all = [...NAV, ADMIN_NAV, NOTIFICATIONS_NAV, { href: '/onboarding', label: 'Welcome', icon: Home, match: '/onboarding' }];
  return all.find((n) => isActive(pathname, n.match))?.label ?? 'Media Navigator';
}
