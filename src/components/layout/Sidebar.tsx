import React, { useState } from 'react';
import { 
  Compass, 
  BarChart3, 
  BrainCircuit, 
  TrendingUp, 
  Clock, 
  Share2, 
  Settings as SettingsIcon,
  Layers,
  FileText,
  Trophy,
  AlertTriangle,
  ChevronDown,
  Building2,
  LogOut,
  ExternalLink,
  Sparkles,
  Check
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { useMedia } from '../../context/MediaContext';
import { NavigationTab } from '../../types';

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

export const Sidebar: React.FC = () => {
  const { 
    currentTab, 
    setCurrentTab, 
    user, 
    logout, 
    setAppView,
    workspaces,
    currentWorkspace,
    setCurrentWorkspace
  } = useMedia();

  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);

  const mainNavItems: NavItem[] = [
    { id: 'overview', label: 'Dashboard Overview', icon: Compass },
    { id: 'analytics', label: 'Analytics Overview', icon: BarChart3 },
    { id: 'content', label: 'Content Library', icon: Layers },
    { id: 'top_performers', label: "What's Working", icon: Trophy },
    { id: 'bottom_performers', label: 'What Needs Improvement', icon: AlertTriangle },
    { id: 'intelligence', label: 'AI Growth Insights', icon: BrainCircuit },
    { id: 'trends', label: 'AI Trends & Ideas', icon: TrendingUp },
    { id: 'timing', label: 'Posting Strategy', icon: Clock },
    { id: 'patterns', label: 'Pattern Analysis', icon: Sparkles },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'connections', label: 'Connections', icon: Share2 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside
      id="main-sidebar"
      className="hidden md:flex flex-col w-[256px] shrink-0 h-screen sticky top-0 bg-white text-[#475569] border-r border-[#E2E8F0] select-none z-30 font-sans"
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#E2E8F0] bg-white">
        <div className="flex items-center gap-2">
          <BrandLogo onClick={() => setAppView('landing')} />
        </div>
        <button
          onClick={() => setAppView('landing')}
          title="View Landing Page"
          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0B132B] hover:bg-slate-100 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Workspace Switcher */}
      <div className="p-3 border-b border-[#E2E8F0] relative bg-white">
        <button
          onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
          className="w-full p-2.5 rounded-xl bg-[#F8FAFC] hover:bg-slate-100/80 border border-[#E2E8F0] flex items-center justify-between text-left transition-colors shadow-2xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#0284C7]/10 border border-[#0284C7]/20 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5 text-[#0284C7]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#0B132B] truncate">
                {currentWorkspace}
              </div>
              <div className="text-[10px] text-[#64748B]">
                Official Enterprise Node
              </div>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
        </button>

        {workspaceMenuOpen && (
          <div className="absolute top-16 left-3 right-3 bg-white border border-[#CBD5E1] rounded-xl shadow-xl p-1.5 z-40 space-y-1">
            <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider px-2 py-1">
              Select Workspace
            </div>
            {workspaces.map((ws) => (
              <button
                key={ws}
                onClick={() => {
                  setCurrentWorkspace(ws);
                  setWorkspaceMenuOpen(false);
                }}
                className={`w-full p-2 rounded-lg text-xs text-left flex items-center justify-between transition-colors ${
                  currentWorkspace === ws
                    ? 'bg-[#0284C7]/10 text-[#0284C7] font-semibold'
                    : 'text-[#334155] hover:bg-slate-50 hover:text-[#0B132B]'
                }`}
              >
                <span className="truncate">{ws}</span>
                {currentWorkspace === ws && <Check className="w-3.5 h-3.5 text-[#0284C7]" />}
              </button>
            ))}
            <div className="pt-1 border-t border-[#E2E8F0] mt-1">
              <button
                onClick={() => {
                  const newName = prompt('Enter new workspace name:', 'New Brand Workspace');
                  if (newName) {
                    setCurrentWorkspace(newName);
                    setWorkspaceMenuOpen(false);
                  }
                }}
                className="w-full px-2 py-1.5 text-xs text-[#0284C7] hover:bg-slate-50 rounded-lg text-left font-medium"
              >
                + Add New Workspace
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto custom-scrollbar text-xs font-medium">
        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
          Core Intelligence
        </div>

        {mainNavItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all ${
                isActive
                  ? 'bg-[#0284C7] text-white shadow-xs font-semibold'
                  : 'text-[#475569] hover:text-[#0B132B] hover:bg-slate-100/80'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#64748B]'}`} />
              <span className="truncate flex-1">{item.label}</span>
            </button>
          );
        })}

        <div className="pt-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
          Strategy & AI Discovery
        </div>

        {mainNavItems.slice(5, 10).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all ${
                isActive
                  ? 'bg-[#0284C7] text-white shadow-xs font-semibold'
                  : 'text-[#475569] hover:text-[#0B132B] hover:bg-slate-100/80'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#64748B]'}`} />
              <span className="truncate flex-1">{item.label}</span>
            </button>
          );
        })}

        <div className="pt-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
          Configuration
        </div>

        {mainNavItems.slice(10).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all ${
                isActive
                  ? 'bg-[#0284C7] text-white shadow-xs font-semibold'
                  : 'text-[#475569] hover:text-[#0B132B] hover:bg-slate-100/80'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#64748B]'}`} />
              <span className="truncate flex-1">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
              alt={user.fullName}
              className="w-8 h-8 rounded-lg object-cover border border-[#CBD5E1] shrink-0"
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#0B132B] truncate">
                {user.fullName}
              </div>
              <div className="text-[10px] text-[#64748B] truncate">
                {user.accountType}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-[#64748B] hover:text-rose-600 hover:bg-slate-200/60 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
