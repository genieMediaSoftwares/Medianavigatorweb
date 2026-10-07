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
    <div className="min-h-screen bg-[#F4F6F9] text-[#0F172A] flex font-sans antialiased selection:bg-[#00F0FF]/30">
      {/* Primary Navy Sidebar (#0B132B) */}
      <aside className="w-64 bg-[#0B132B] text-slate-300 flex flex-col justify-between shrink-0 border-r border-[#1C2541] shadow-xl z-20">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-[#1C2541] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00F0FF] to-[#0284C7] flex items-center justify-center text-[#0B132B] font-black text-sm shadow-md">
                MN
              </div>
              <div>
                <div className="text-sm font-black text-white tracking-tight leading-none flex items-center gap-1.5">
                  <span>ADMIN PANEL</span>
                  <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse"></span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">SecOps Command v2.4</div>
              </div>
            </div>
          </div>

          {/* Super Admin Status Badge */}
          <div className="p-3 mx-3 my-3 rounded-xl bg-[#1C2541]/80 border border-[#1C2541] space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
              <span>Authority Level</span>
              <Shield className="w-3.5 h-3.5 text-[#00F0FF]" />
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse"></span>
              <span className="text-xs font-black text-white tracking-wide">SUPER ADMIN</span>
            </div>
            <div className="text-[10px] text-[#00F0FF] font-medium">Full Governance & SecOps Privileges</div>
          </div>

          {/* Final Product Navigation Order (Section 6 Spec) */}
          <nav className="px-3 py-2 space-y-1">
            <div className="px-3 pb-1.5 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
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
                      ? 'bg-[#1C2541] text-[#00F0FF] border-l-4 border-[#00F0FF] shadow-xs'
                      : 'text-slate-300 hover:bg-[#1C2541]/60 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#00F0FF]' : 'text-slate-400'}`} />
                  <span className="truncate">{nav.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer & Back to Client App */}
        <div className="p-4 border-t border-[#1C2541] space-y-2">
          <button
            onClick={() => setAppView('app')}
            className="w-full py-2 px-3 rounded-xl bg-[#1C2541] text-xs font-semibold text-slate-200 hover:text-white hover:bg-[#1C2541]/80 transition-all flex items-center justify-center gap-2 border border-slate-700/50"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span>Switch to Creator App</span>
          </button>
          
          <button
            onClick={() => setAppView('landing')}
            className="w-full py-1.5 text-center text-[11px] text-slate-400 hover:text-rose-400 transition-colors flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign Out Operator</span>
          </button>
        </div>
      </aside>

      {/* Main Administrative Canvas (#F4F6F9) */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F4F6F9]">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-black text-[#0B132B] uppercase tracking-wide">
              {navigationOrder.find(n => n.id === currentTab)?.label.replace(/^\d+\.\s*/, '') || 'Admin Console'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1C2541] text-[#00F0FF] uppercase font-mono">
              ROLE: SUPER ADMIN
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2.5 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>API Gateway: <strong>Operational (14ms)</strong></span>
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <img 
                src={adminProfile.photoUrl} 
                alt={adminProfile.name} 
                className="w-8 h-8 rounded-full object-cover border border-slate-300"
              />
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-[#0B132B] leading-none">{adminProfile.name}</div>
                <div className="text-[10px] text-slate-400">{adminProfile.email}</div>
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
