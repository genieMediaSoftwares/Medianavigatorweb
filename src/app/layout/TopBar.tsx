import React, { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, Menu, RefreshCw, Check, Layers } from 'lucide-react';
import { useMedia } from '../providers/MediaContext';
import { navItem } from '../navigation';
import { PlatformType } from '../../types';
import { BrandMark } from '../../components/common/BrandLogo';

const PLATFORM_OPTIONS: { id: 'all' | PlatformType; label: string }[] = [
  { id: 'all', label: 'All channels' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'linkedin', label: 'LinkedIn' },
];

function useClickAway<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, close]);
  return ref;
}

export const TopBar: React.FC<{ onMobileMenuClick?: () => void }> = ({ onMobileMenuClick }) => {
  const { currentTab, selectedPlatform, setSelectedPlatform, unreadNotificationCount, unreadAlertCount, setIsNotificationsOpen, startSyncFlow, syncState, connections } = useMedia();
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useClickAway<HTMLDivElement>(filterOpen, () => setFilterOpen(false));
  const page = navItem(currentTab);
  const connected = connections.filter((c) => c.connected);
  const bell = unreadNotificationCount + unreadAlertCount;
  const filterLabel = PLATFORM_OPTIONS.find((p) => p.id === selectedPlatform)?.label ?? 'All channels';

  return (
    <header id="top-bar" className="h-[72px] px-4 md:px-8 bg-canvas/85 backdrop-blur-md border-b border-line flex items-center gap-3 sticky top-0 z-20">
      <button onClick={onMobileMenuClick} className="md:hidden -ml-1 p-2 rounded-xl text-ink hover:bg-canvas-soft" aria-label="Open menu">
        <Menu className="w-5 h-5" />
      </button>
      <BrandMark className="w-8 h-8 md:hidden" />

      <div className="min-w-0 flex-1">
        <h1 className="text-lg md:text-xl font-bold tracking-tight text-ink truncate leading-tight">{page.title}</h1>
        <p className="hidden sm:block text-sm text-muted truncate leading-tight">{page.subtitle}</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={filterRef}>
          <button onClick={() => setFilterOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={filterOpen} className="btn btn-secondary btn-sm">
            <Layers className="w-4 h-4 text-brand-600" />
            <span className="hidden sm:inline">{filterLabel}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted" />
          </button>
          {filterOpen && (
            <ul role="listbox" className="absolute right-0 mt-2 w-48 p-1.5 bg-white border border-line rounded-2xl shadow-pop z-30 animate-fade-up">
              {PLATFORM_OPTIONS.map((o) => {
                const isConnected = o.id === 'all' || connections.find((c) => c.platform === o.id)?.connected;
                return (
                  <li key={o.id}>
                    <button
                      role="option" aria-selected={selectedPlatform === o.id}
                      onClick={() => { setSelectedPlatform(o.id); setFilterOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 h-9 rounded-lg text-sm text-left ${selectedPlatform === o.id ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-body hover:bg-canvas-soft'}`}
                    >
                      <span className="flex-1">{o.label}</span>
                      {!isConnected && <span className="text-xs text-subtle">not linked</span>}
                      {selectedPlatform === o.id && <Check className="w-4 h-4" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <button
          onClick={() => startSyncFlow(selectedPlatform !== 'all' ? selectedPlatform : 'all')}
          disabled={syncState.isSyncing || connected.length === 0}
          title={connected.length === 0 ? 'Connect an account to sync' : 'Fetch the latest posts and numbers'}
          className="btn btn-primary btn-sm"
        >
          <RefreshCw className={`w-4 h-4 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{syncState.isSyncing ? 'Syncing…' : 'Sync'}</span>
        </button>

        <button onClick={() => setIsNotificationsOpen(true)} className="relative btn btn-secondary btn-sm !px-2.5" aria-label={bell ? `Notifications, ${bell} unread` : 'Notifications'}>
          <Bell className="w-4 h-4" />
          {bell > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center ring-2 ring-canvas">{bell > 9 ? '9+' : bell}</span>}
        </button>
      </div>
    </header>
  );
};
