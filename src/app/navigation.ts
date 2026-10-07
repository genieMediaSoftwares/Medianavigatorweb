import type { ComponentType } from 'react';
import {
  LayoutDashboard, BarChart3, Layers, Trophy, TriangleAlert, Columns3, Sparkles, TrendingUp, Shapes, Clock,
  Lightbulb, CalendarDays, FileText, Plug, Bell, Settings as SettingsIcon,
} from 'lucide-react';
import type { NavigationTab } from '../types';

export interface NavItem {
  id: NavigationTab;
  label: string;
  /** Page heading and one-line description shown in the top bar */
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Shown as the last item in the phone tab bar */
  primaryOnMobile?: boolean;
}

export interface NavGroup { label: string; items: NavItem[] }

/** Single source of truth for the sidebar, the phone menu and the page headings. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Home',
    items: [
      { id: 'overview', label: 'Overview', title: 'Overview', subtitle: 'How your content is doing right now', icon: LayoutDashboard, primaryOnMobile: true },
    ],
  },
  {
    label: 'Performance',
    items: [
      { id: 'analytics', label: 'Analytics', title: 'Analytics', subtitle: 'Which formats earn the most engagement', icon: BarChart3 },
      { id: 'content', label: 'Content library', title: 'Content library', subtitle: 'Every post, video and reel, in one place', icon: Layers, primaryOnMobile: true },
      { id: 'top_performers', label: "What's working", title: "What's working", subtitle: 'Your strongest posts and why they stood out', icon: Trophy },
      { id: 'bottom_performers', label: 'Needs attention', title: 'Needs attention', subtitle: 'Posts that fell short of your usual results', icon: TriangleAlert },
      { id: 'crossplatform', label: 'Platform comparison', title: 'Platform comparison', subtitle: 'How your channels stack up against each other', icon: Columns3 },
    ],
  },
  {
    label: 'Insights',
    items: [
      { id: 'intelligence', label: 'AI insights', title: 'AI insights', subtitle: 'Signals and answers grounded in your data', icon: Sparkles, primaryOnMobile: true },
      { id: 'trends', label: 'Trends', title: 'Trends', subtitle: 'What is rising or fading in your results', icon: TrendingUp },
      { id: 'patterns', label: 'Patterns', title: 'Patterns', subtitle: 'Formats and habits that keep paying off', icon: Shapes },
      { id: 'timing', label: 'Best times', title: 'Best times to post', subtitle: 'When your audience responds most', icon: Clock },
    ],
  },
  {
    label: 'Plan',
    items: [
      { id: 'recommendations', label: 'Recommendations', title: 'Recommendations', subtitle: 'Your next moves, ranked by evidence', icon: Lightbulb },
      { id: 'planner', label: 'Content planner', title: 'Content planner', subtitle: 'Schedule what you will publish next', icon: CalendarDays, primaryOnMobile: true },
      { id: 'reports', label: 'Reports', title: 'Reports', subtitle: 'Shareable summaries of your performance', icon: FileText },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { id: 'connections', label: 'Connections', title: 'Connections', subtitle: 'Link and manage your social accounts', icon: Plug },
      { id: 'alerts', label: 'Alerts', title: 'Alerts', subtitle: 'Spikes, dips and account issues', icon: Bell },
      { id: 'settings', label: 'Settings', title: 'Settings', subtitle: 'Profile, security and preferences', icon: SettingsIcon },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
export const navItem = (id: NavigationTab): NavItem => NAV_ITEMS.find((n) => n.id === id) ?? NAV_ITEMS[0];
