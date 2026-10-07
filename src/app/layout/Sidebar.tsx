import React from 'react';
import { LogOut, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { BrandLogo } from '../../components/common/BrandLogo';
import { useMedia } from '../providers/MediaContext';
import { NAV_GROUPS } from '../navigation';

export const initials = (name: string, email: string) => {
  const src = (name || email || '?').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};

/** Navigation list shared by the desktop sidebar and the phone menu. */
export const NavList: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const { currentTab, setCurrentTab, unreadAlertCount } = useMedia();
  return (
    <nav aria-label="Main" className="space-y-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="eyebrow px-3 mb-1.5">{group.label}</div>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = currentTab === item.id;
              const Icon = item.icon;
              const badge = item.id === 'alerts' && unreadAlertCount > 0 ? unreadAlertCount : null;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => { setCurrentTab(item.id); onNavigate?.(); }}
                    aria-current={active ? 'page' : undefined}
                    className={`group w-full flex items-center gap-3 px-3 h-9 rounded-xl text-sm font-semibold transition-colors ${
                      active ? 'bg-brand-50 text-brand-700' : 'text-body hover:bg-canvas-soft hover:text-ink'
                    }`}
                  >
                    <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-brand-600' : 'text-muted group-hover:text-ink'}`} strokeWidth={active ? 2.25 : 1.9} />
                    <span className="truncate">{item.label}</span>
                    {badge !== null && <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">{badge}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
};

export const AccountCard: React.FC = () => {
  const { user, logout, isAdmin, setAppView } = useMedia();
  return (
    <div className="space-y-2">
      {isAdmin && (
        <button onClick={() => setAppView('admin')} className="w-full flex items-center gap-2.5 px-3 h-10 rounded-xl text-sm font-semibold text-ink bg-canvas-soft hover:bg-line transition-colors">
          <ShieldCheck className="w-[18px] h-[18px] text-brand-600" />
          Admin console
          <ArrowUpRight className="w-4 h-4 ml-auto text-muted" />
        </button>
      )}
      <div className="flex items-center gap-3 p-2.5 rounded-xl border border-line bg-white">
        <span className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white text-sm font-bold flex items-center justify-center shrink-0" aria-hidden="true">
          {initials(user.fullName, user.email)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink truncate">{user.fullName || 'Your account'}</div>
          <div className="text-xs text-muted truncate">{user.email}</div>
        </div>
        <button onClick={logout} aria-label="Sign out" title="Sign out" className="p-2 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const { setAppView } = useMedia();
  return (
    <aside id="main-sidebar" className="hidden md:flex flex-col w-[264px] shrink-0 h-screen sticky top-0 bg-white border-r border-line z-30">
      <div className="h-[72px] px-5 flex items-center">
        <BrandLogo onClick={() => setAppView('landing')} />
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4 pt-1">
        <NavList />
      </div>
      <div className="p-3 border-t border-line">
        <AccountCard />
      </div>
    </aside>
  );
};
