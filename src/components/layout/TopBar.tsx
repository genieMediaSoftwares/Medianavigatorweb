import React, { useState } from 'react';
import { 
  ChevronDown, 
  Bell, 
  Sparkles, 
  RotateCw, 
  Menu,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  Globe
} from 'lucide-react';
import { useMedia } from '../../context/MediaContext';
import { PlatformType } from '../../types';

export const TopBar: React.FC<{ onMobileMenuClick?: () => void }> = ({ onMobileMenuClick }) => {
  const { 
    timeframe, 
    setTimeframe, 
    selectedPlatform, 
    setSelectedPlatform, 
    unreadNotificationCount, 
    setIsNotificationsOpen,
    startSyncFlow,
    syncState,
    currentWorkspace,
    connections,
    user,
    setAppView
  } = useMedia();

  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [showSyncMenu, setShowSyncMenu] = useState(false);

  const timeOptions = ['Last 7 days', 'Last 14 days', 'Last 30 days', 'Full Historical Archive'];
  const platformOptions: { id: 'all' | PlatformType; label: string }[] = [
    { id: 'all', label: 'All Channels' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'facebook', label: 'Facebook' },
    { id: 'linkedin', label: 'LinkedIn' },
  ];

  const currentPlatformLabel = platformOptions.find(p => p.id === selectedPlatform)?.label || 'All Channels';
  const activeSyncPlatform: PlatformType = selectedPlatform !== 'all'
    ? selectedPlatform
    : (connections.find(c => c.connected)?.platform || 'youtube');
  const activeAccount = connections.find(c => c.platform === activeSyncPlatform)?.accountHandle || activeSyncPlatform;

  return (
    <header
      id="top-bar"
      className="h-16 px-4 md:px-8 bg-white border-b border-[#E2E8F0] flex items-center justify-between sticky top-0 z-20"
    >
      {/* Left side: Context and Workspace */}
      <div className="flex items-center gap-3">
        {onMobileMenuClick && (
          <button
            onClick={onMobileMenuClick}
            className="md:hidden p-1.5 rounded-lg text-[#0F172A] hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm md:text-base font-bold text-[#0B132B] tracking-tight leading-tight">
              {currentWorkspace}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Ingestion Active
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] leading-none mt-0.5 hidden sm:block">
            Connected multi-channel intelligence workspace
          </p>
        </div>
      </div>

      {/* Center/Right: Clean filters & actions */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Platform Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowPlatformDropdown(!showPlatformDropdown);
              setShowTimeDropdown(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] hover:bg-slate-100 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>{currentPlatformLabel}</span>
            <ChevronDown className="w-3 h-3 text-[#64748B]" />
          </button>

          {showPlatformDropdown && (
            <div className="absolute right-0 mt-1.5 w-40 py-1 bg-white border border-[#CBD5E1] rounded-xl shadow-xl z-30">
              {platformOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setSelectedPlatform(opt.id);
                    setShowPlatformDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                    selectedPlatform === opt.id
                      ? 'bg-[#0284C7]/10 text-[#0284C7] font-semibold'
                      : 'text-[#475569] hover:bg-slate-50'
                  }`}
                >
                  <span>{opt.label}</span>
                  {selectedPlatform === opt.id && <CheckCircle2 className="w-3.5 h-3.5 text-[#0284C7]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Timeframe Filter Dropdown */}
        <div className="relative">
          <button
            id="timeframe-dropdown-button"
            onClick={() => {
              setShowTimeDropdown(!showTimeDropdown);
              setShowPlatformDropdown(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] hover:bg-slate-100 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
            <span>{timeframe}</span>
            <ChevronDown className="w-3 h-3 text-[#64748B]" />
          </button>

          {showTimeDropdown && (
            <div className="absolute right-0 mt-1.5 w-44 py-1 bg-white border border-[#CBD5E1] rounded-xl shadow-xl z-30">
              {timeOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setTimeframe(opt);
                    setShowTimeDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    timeframe === opt
                      ? 'bg-[#0284C7]/10 text-[#0284C7] font-semibold'
                      : 'text-[#475569] hover:bg-slate-50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Link to Landing Page */}
        <button
          onClick={() => setAppView('landing')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] hover:bg-slate-50 transition-colors shadow-2xs"
          title="Return to Landing Page"
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-[#0284C7]" />
          <span>Landing Page</span>
        </button>

        {/* Live Sync Trigger with Two Options */}
        <div className="relative">
          <div className="flex items-center rounded-xl bg-white border border-[#CBD5E1] shadow-2xs hover:border-[#0284C7]/60 transition-all overflow-hidden">
            <button
              onClick={() => {
                setShowSyncMenu(false);
                startSyncFlow(selectedPlatform !== 'all' ? selectedPlatform : 'all');
              }}
              disabled={syncState.isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0B132B] hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              title="Sync now to ingest real posts and metrics"
            >
              <RotateCw className={`w-3.5 h-3.5 text-[#0284C7] ${syncState.isSyncing ? 'animate-spin' : ''}`} />
              <span>{syncState.isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            <button
              onClick={() => setShowSyncMenu(!showSyncMenu)}
              disabled={syncState.isSyncing}
              className="p-1.5 border-l border-[#CBD5E1] hover:bg-slate-100 text-[#64748B] hover:text-[#0B132B] transition-colors cursor-pointer"
              title="Select sync options"
              aria-label="Toggle sync options"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dual Sync Dropdown Menu */}
          {showSyncMenu && (
            <>
              <div 
                className="fixed inset-0 z-20 cursor-default" 
                onClick={() => setShowSyncMenu(false)} 
              />
              <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-[#CBD5E1] py-1 z-30 animate-fadeIn space-y-0.5">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#64748B] border-b border-[#F1F5F9]">
                Choose Sync Scope
              </div>

              <button
                onClick={() => {
                  setShowSyncMenu(false);
                  startSyncFlow(selectedPlatform !== 'all' ? selectedPlatform : activeSyncPlatform);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-[#F8FAFC] flex items-start gap-2.5 transition-colors cursor-pointer group"
              >
                <RotateCw className="w-4 h-4 text-[#0284C7] mt-0.5 shrink-0 group-hover:rotate-45 transition-transform" />
                <div>
                  <div className="font-bold text-[#0B132B]">
                    Sync Current Channel ({currentPlatformLabel})
                  </div>
                  <div className="text-[10px] text-[#64748B]">
                    Ingest real posts for active platform filter
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowSyncMenu(false);
                  startSyncFlow('all');
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-[#F8FAFC] flex items-start gap-2.5 transition-colors cursor-pointer group"
              >
                <Globe className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <div className="font-bold text-[#0B132B]">
                    Sync All Channels
                  </div>
                  <div className="text-[10px] text-[#64748B]">
                    Parallel ingestion across all connected channels
                  </div>
                </div>
              </button>
            </div>
            </>
          )}
        </div>

        {/* Notification Bell Button */}
        <button
          onClick={() => setIsNotificationsOpen(true)}
          className="relative p-2 rounded-xl text-[#475569] hover:text-[#0B132B] hover:bg-slate-100 transition-colors"
          aria-label="Open notifications drawer"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#0284C7] text-white text-[9px] font-bold flex items-center justify-center">
              {unreadNotificationCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
