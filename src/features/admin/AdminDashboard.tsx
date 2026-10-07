import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Share2, 
  TrendingUp, 
  CreditCard, 
  Bell, 
  HelpCircle, 
  ShieldAlert, 
  LogOut, 
  ArrowLeft,
  ChevronDown,
  Shield,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useAdmin } from '../../app/providers/AdminContext';
import { useMedia } from '../../app/providers/MediaContext';
import { AdminRole, AdminTab } from './types';

// Screen Modules
import { AdminDashboardOverview } from './AdminDashboardOverview';
import { AdminUserManagement } from './AdminUserManagement';
import { AdminSocialAccounts } from './AdminSocialAccounts';
import { AdminTrendManagement } from './AdminTrendManagement';
import { AdminSubscriptions } from './AdminSubscriptions';
import { AdminNotifications } from './AdminNotifications';
import { AdminSupportFeedback } from './AdminSupportFeedback';
import { AdminAuditLogsSettings } from './AdminAuditLogsSettings';

export const AdminDashboard: React.FC = () => {
  const { currentTab, setCurrentTab, adminProfile } = useAdmin();
  const { setAppView } = useMedia();

  const navigationOrder: { id: AdminTab; label: string; icon: any }[] = [
    { id: 'dashboard', label: '1. Dashboard', icon: LayoutDashboard },
    { id: 'users', label: '2. Users', icon: Users },
    { id: 'social_accounts', label: '3. Social Accounts', icon: Share2 },
    { id: 'trend_management', label: '4. Trend Management', icon: TrendingUp },
    { id: 'subscriptions', label: '5. Subscriptions & Billing', icon: CreditCard },
    { id: 'notifications', label: '6. Notifications', icon: Bell },
    { id: 'support_feedback', label: '7. Support & Feedback', icon: HelpCircle },
    { id: 'audit_logs', label: '8. Audit Logs & Settings', icon: ShieldAlert },
  ];

  const renderActiveScreen = () => {
    switch (currentTab) {
      case 'dashboard':
        return <AdminDashboardOverview />;
      case 'users':
        return <AdminUserManagement />;
      case 'social_accounts':
        return <AdminSocialAccounts />;
      case 'trend_management':
        return <AdminTrendManagement />;
      case 'subscriptions':
        return <AdminSubscriptions />;
      case 'notifications':
        return <AdminNotifications />;
      case 'support_feedback':
        return <AdminSupportFeedback />;
      case 'audit_logs':
        return <AdminAuditLogsSettings />;
      default:
        return <AdminDashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex font-sans antialiased selection:bg-brand-300/30">
      {/* Primary Navy Sidebar (#1f1611) */}
      <aside className="w-64 bg-ink text-stone-300 flex flex-col justify-between shrink-0 border-r border-ink-soft shadow-xl z-20">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-ink-soft flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-300 to-brand-600 flex items-center justify-center text-ink font-black text-sm shadow-md">
                MN
              </div>
              <div>
                <div className="text-sm font-black text-white tracking-tight leading-none flex items-center gap-1.5">
                  <span>ADMIN PANEL</span>
                  <span className="w-2 h-2 rounded-full bg-brand-300 animate-pulse"></span>
                </div>
                <div className="text-xs text-stone-400">SecOps Command v2.4</div>
              </div>
            </div>
          </div>

          {/* Super Admin Status Badge */}
          <div className="p-3 mx-3 my-3 rounded-xl bg-ink-soft/80 border border-ink-soft space-y-1">
            <div className="text-xs uppercase font-bold text-stone-400 tracking-wider flex items-center justify-between">
              <span>Authority Level</span>
              <Shield className="w-3.5 h-3.5 text-brand-300" />
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="w-2 h-2 rounded-full bg-brand-300 animate-pulse"></span>
              <span className="text-xs font-black text-white tracking-wide">SUPER ADMIN</span>
            </div>
            <div className="text-xs text-brand-300 font-medium">Full Governance & SecOps Privileges</div>
          </div>

          {/* Final Product Navigation Order (Section 6 Spec) */}
          <nav className="px-3 py-2 space-y-1">
            <div className="px-3 pb-1.5 text-xs uppercase font-bold text-stone-500 tracking-wider">
              Administrative Modules
            </div>

            {navigationOrder.map((nav) => {
              const Icon = nav.icon;
              const isActive = currentTab === nav.id;

              return (
                <button
                  key={nav.id}
                  onClick={() => setCurrentTab(nav.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-ink-soft text-brand-300 border-l-4 border-brand-300 shadow-xs'
                      : 'text-stone-300 hover:bg-ink-soft/60 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-300' : 'text-stone-400'}`} />
                  <span className="truncate">{nav.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer & Back to Client App */}
        <div className="p-4 border-t border-ink-soft space-y-2">
          <button
            onClick={() => setAppView('app')}
            className="w-full py-2 px-3 rounded-xl bg-ink-soft text-xs font-semibold text-stone-200 hover:text-white hover:bg-ink-soft/80 transition-all flex items-center justify-center gap-2 border border-stone-700/50"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-brand-300" />
            <span>Switch to Creator App</span>
          </button>
          
          <button
            onClick={() => setAppView('landing')}
            className="w-full py-1.5 text-center text-xs text-stone-400 hover:text-rose-400 transition-colors flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign Out Operator</span>
          </button>
        </div>
      </aside>

      {/* Main Administrative Canvas (#faf7f2) */}
      <div className="flex-1 flex flex-col min-w-0 bg-canvas">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-stone-200 px-6 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-black text-ink uppercase tracking-wide">
              {navigationOrder.find(n => n.id === currentTab)?.label.replace(/^\d+\.\s*/, '') || 'Admin Console'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-ink-soft text-brand-300 uppercase">
              ROLE: SUPER ADMIN
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2.5 text-xs text-stone-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>API Gateway: <strong>Operational (14ms)</strong></span>
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-stone-200">
              <img 
                src={adminProfile.photoUrl} 
                alt={adminProfile.name} 
                className="w-8 h-8 rounded-full object-cover border border-stone-300"
              />
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-ink leading-none">{adminProfile.name}</div>
                <div className="text-xs text-stone-400">{adminProfile.email}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
          {renderActiveScreen()}
        </main>
      </div>
    </div>
  );
};
