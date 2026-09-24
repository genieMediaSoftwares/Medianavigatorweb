import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  RotateCw, 
  Sparkles, 
  Key,
  Plus,
  Settings,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { api, OverviewData } from '../services/api';
import { KeySignal, Observation, PlatformType, PlatformConnection } from '../types';
import { PlatformConnectModal } from '../components/modals/PlatformConnectModal';
import { 
  InstagramLogo, 
  YouTubeLogo, 
  FacebookLogo, 
  LinkedInLogo 
} from '../components/common/PlatformLogos';

const PLATFORMS_ORDER: PlatformType[] = ['instagram', 'youtube', 'facebook', 'linkedin'];

const PLATFORM_CONFIG: Record<PlatformType, {
  name: string;
  logo: (variant?: 'light' | 'subtle' | 'original') => React.ReactNode;
  apiLabel: string;
  ingestDescription: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
}> = {
  instagram: {
    name: 'Instagram',
    logo: (variant) => <InstagramLogo size="md" variant={variant} />,
    apiLabel: 'Meta Graph API v22.0',
    ingestDescription: 'Reels · Posts · Reach · Real Views',
    accentBg: 'bg-gradient-to-tr from-amber-500/10 via-rose-500/10 to-purple-500/10',
    accentBorder: 'border-rose-200/60',
    accentText: 'text-rose-600',
  },
  youtube: {
    name: 'YouTube',
    logo: (variant) => <YouTubeLogo size="md" variant={variant} />,
    apiLabel: 'YouTube Data API v3',
    ingestDescription: 'Shorts · Retention · Views · Subscribers',
    accentBg: 'bg-red-500/10',
    accentBorder: 'border-red-200/60',
    accentText: 'text-red-600',
  },
  facebook: {
    name: 'Facebook',
    logo: (variant) => <FacebookLogo size="md" variant={variant} />,
    apiLabel: 'Meta Page Insights API',
    ingestDescription: 'Page Posts · Viral Shares · Video Reach',
    accentBg: 'bg-blue-500/10',
    accentBorder: 'border-blue-200/60',
    accentText: 'text-blue-600',
  },
  linkedin: {
    name: 'LinkedIn',
    logo: (variant) => <LinkedInLogo size="md" variant={variant} />,
    apiLabel: 'LinkedIn Community API',
    ingestDescription: 'Carousels · B2B Articles · Feed Depth',
    accentBg: 'bg-sky-500/10',
    accentBorder: 'border-sky-200/60',
    accentText: 'text-sky-600',
  },
};

export const Overview: React.FC = () => {
  const { 
    selectedPlatform, 
    setSelectedPlatform, 
    setCurrentTab, 
    connections, 
    refreshConnections,
    startSyncFlow
  } = useMedia();

  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);
  const [connectModalPlatform, setConnectModalPlatform] = useState<PlatformType | null>(null);

  const loadData = () => {
    setLoading(true);
    api.getOverview()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err: any) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [selectedPlatform, connections]);

  const handleSignalAction = (target: string) => {
    if (target.startsWith('platform:')) {
      const p = target.split(':')[1];
      setSelectedPlatform(p as any);
      setCurrentTab('content');
    } else {
      setCurrentTab(target as any);
    }
  };

  const hasConnectedPlatforms = connections.some((c) => c.connected);

  // Helper to retrieve connection record for a platform
  const getConnection = (platform: PlatformType): PlatformConnection => {
    const found = connections.find((c) => c.platform === platform);
    if (found) return found;
    return {
      platform,
      name: PLATFORM_CONFIG[platform].name,
      accountHandle: 'Not connected',
      connected: false,
      lastSyncedAt: '',
      status: 'not_connected',
      statusMessage: `Connect ${PLATFORM_CONFIG[platform].name} to start analyzing your media.`,
      primaryStrength: PLATFORM_CONFIG[platform].ingestDescription,
      dataPointsCount: 0,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24 text-xs text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0]">
        <RotateCw className="w-5 h-5 animate-spin text-[#0284C7] mr-2" />
        Loading real-time media signals...
      </div>
    );
  }

  // Render Platform Channels Grid Component
  const renderPlatformGrid = (isCompact = false) => (
    <section id="platform-channels-section" className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B132B] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0284C7]" />
            <span>Integrated Media Channels &amp; Platform Status</span>
          </h2>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Direct connections to official APIs with verified read-only scopes. Connect your accounts to analyze all published media.
          </p>
        </div>
        <button
          onClick={() => setCurrentTab('connections')}
          className="text-xs font-semibold text-[#0284C7] hover:text-[#0369A1] hover:underline flex items-center gap-1"
        >
          <span>All Integrations</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLATFORMS_ORDER.map((platform) => {
          const conn = getConnection(platform);
          const cfg = PLATFORM_CONFIG[platform];
          const isSelected = selectedPlatform === platform;

          return (
            <div
              key={platform}
              id={`platform-card-${platform}`}
              className={`p-4 rounded-2xl bg-white border transition-all flex flex-col justify-between space-y-3.5 shadow-2xs hover:shadow-md ${
                isSelected 
                  ? 'border-[#0284C7] ring-2 ring-[#0284C7]/15' 
                  : 'border-[#E2E8F0] hover:border-slate-300'
              }`}
            >
              {/* Top Row: Logo & Status Badge */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl ${cfg.accentBg} border ${cfg.accentBorder} flex items-center justify-center shrink-0 shadow-2xs`}>
                      {cfg.logo('light')}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0B132B] leading-tight flex items-center gap-1.5">
                        <span>{cfg.name}</span>
                        {isSelected && (
                          <span className="text-[9px] font-bold text-[#0284C7] bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                            Active Filter
                          </span>
                        )}
                      </h3>
                      <div className="text-[10px] text-[#64748B] font-mono">
                        {cfg.apiLabel}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      conn.connected
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-[#64748B] border border-slate-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${conn.connected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {conn.connected ? 'Active' : 'Not Connected'}
                  </span>
                </div>

                {/* Account Details & Ingestion scope */}
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-[#0B132B] truncate">
                    {conn.connected 
                      ? (conn.accountHandle !== 'Not connected' ? conn.accountHandle : `Connected Account`)
                      : 'No Account Linked'}
                  </div>
                  <div className="text-[11px] text-[#64748B] leading-snug line-clamp-2">
                    {cfg.ingestDescription}
                  </div>
                  {conn.connected && (
                    <div className="pt-1 text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{conn.dataPointsCount > 0 ? `${conn.dataPointsCount} assets analyzed` : 'Live API connection ready'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-[#F1F5F9]">
                {conn.connected ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlatform(selectedPlatform === platform ? 'all' : platform);
                      }}
                      className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                        isSelected
                          ? 'bg-[#0B132B] text-white border-[#0B132B]'
                          : 'bg-[#F8FAFC] hover:bg-slate-100 text-[#0F172A] border-[#CBD5E1]'
                      }`}
                    >
                      {isSelected ? 'Reset Filter' : 'Filter Feed'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConnectModalPlatform(platform)}
                      className="py-2 px-3 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-[#0F172A] border border-[#CBD5E1] shadow-2xs flex items-center justify-center gap-1 transition-all"
                      title="Manage API connection & credentials"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#64748B]" />
                      <span>Manage</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConnectModalPlatform(platform)}
                    className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-[#0284C7] hover:bg-[#0369A1] text-white transition-all shadow-2xs flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Connect {cfg.name}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  return (
    <div id="overview-screen" className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* If no media data exists, display clean state with platform channels hub */}
      {(!data || !data.hasData || data.signals.length === 0) ? (
        <div className="space-y-6">
          <div className="p-8 rounded-3xl bg-white border border-[#E2E8F0] shadow-2xs space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#0284C7]/10 text-[#0284C7] border border-[#0284C7]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7]" />
              {hasConnectedPlatforms ? 'Channels Connected — Awaiting Media Assets' : 'Connect Your Media Accounts'}
            </div>
            <h1 className="text-xl md:text-3xl font-bold text-[#0B132B] tracking-tight">
              {hasConnectedPlatforms 
                ? 'Your account is connected. Synchronize to ingest media assets.' 
                : 'Connect YouTube, Instagram, Facebook, or LinkedIn to unlock Media Intelligence.'}
            </h1>
            <p className="text-sm text-[#64748B] leading-relaxed max-w-2xl">
              {hasConnectedPlatforms
                ? 'We established secure read access to your platform API. Click below to synchronize your published posts, reels, and video metrics.'
                : 'Media Navigator performs deep forensic intelligence and retention breakdowns across all your channels. Connect your accounts using the buttons below to begin.'}
            </p>
          </div>

          {/* Quick Platform Connection Cards with Connect Buttons */}
          {renderPlatformGrid(false)}
        </div>
      ) : (
        <>
          {/* 1. HERO INSIGHT CARD */}
          <section
            id="hero-insight-card"
            className="relative overflow-hidden p-6 md:p-8 rounded-3xl bg-white border border-[#E2E8F0] shadow-2xs"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-8 space-y-3">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {data.hero.badge}
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-[#0B132B] tracking-tight leading-snug">
                  {data.hero.heading}
                </h1>

                <p className="text-sm text-[#64748B] leading-relaxed max-w-2xl font-normal">
                  {data.hero.summary}
                </p>

                <div className="pt-2 flex items-center gap-3 text-xs text-[#64748B]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7]" />
                    Real-time cross-platform signals
                  </span>
                  <span className="text-[#CBD5E1]">•</span>
                  <span className="text-[#64748B]/80 font-mono">Confidence: {data.hero.confidence}</span>
                </div>
              </div>

              {/* Right side abstract visualization */}
              <div className="md:col-span-4 flex justify-center md:justify-end">
                <div className="relative w-44 h-36 flex items-center justify-center p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <svg viewBox="0 0 160 120" className="w-full h-full">
                    <line x1="10" y1="30" x2="150" y2="30" stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="1" />
                    <line x1="10" y1="60" x2="150" y2="60" stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="1" />
                    <line x1="10" y1="90" x2="150" y2="90" stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="1" />
                    <path
                      d="M 20 85 C 50 80, 80 50, 140 25"
                      fill="none"
                      stroke="#0284C7"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle cx="20" cy="85" r="3.5" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2" />
                    <circle cx="80" cy="50" r="3.5" fill="#FFFFFF" stroke="#0284C7" strokeWidth="2" />
                    <circle cx="140" cy="25" r="4.5" fill="#059669" stroke="#FFFFFF" strokeWidth="1.5" />
                  </svg>
                </div>
              </div>
            </div>
          </section>

          {/* 2. CHANNELS INTEGRATION & STATUS HUB (ALWAYS VISIBLE ON OVERVIEW) */}
          {renderPlatformGrid(false)}

          {/* 3. KEY SIGNALS */}
          <section id="key-signals-section" className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#0B132B] tracking-tight">
                Key Signals
              </h2>
              <p className="text-xs text-[#64748B]">
                Real-world momentum identified across your verified media posts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.signals.map((sig: KeySignal) => (
                <div
                  key={sig.id}
                  id={`key-signal-${sig.id}`}
                  className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs flex flex-col justify-between hover:border-[#0284C7]/40 transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                        {sig.category}
                      </span>
                      <span className="text-xl">{sig.icon}</span>
                    </div>
                    <h3 className="text-base font-bold text-[#0B132B] tracking-tight mb-1.5">
                      {sig.title}
                    </h3>
                    <p className="text-xs text-[#64748B] leading-relaxed mb-5 font-normal">
                      {sig.description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSignalAction(sig.actionTarget)}
                    className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-[#0284C7] hover:bg-[#0369A1] text-white transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <span>{sig.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* 4. “WHAT HAPPENED?” OBSERVATIONS */}
          {data.observations.length > 0 && (
            <section id="what-happened-section" className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#0B132B] tracking-tight">
                  What happened?
                </h2>
                <p className="text-xs text-[#64748B]">
                  Intelligent observations distilled from verified platform data.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.observations.map((obs: Observation) => (
                  <div
                    key={obs.id}
                    id={`observation-${obs.id}`}
                    className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs flex flex-col justify-between hover:border-[#0284C7]/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="p-1.5 rounded-lg bg-[#0284C7]/10 text-[#0284C7] border border-[#0284C7]/20">
                          <Sparkles className="w-3.5 h-3.5" />
                        </span>
                        <h3 className="text-sm font-bold text-[#0B132B] tracking-tight">
                          {obs.title}
                        </h3>
                      </div>

                      <p className="text-xs text-[#64748B] leading-relaxed mb-4">
                        {obs.explanation}
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedObservation(obs)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0284C7] hover:text-[#0369A1] transition-colors pt-2 border-t border-[#E2E8F0]"
                    >
                      <span>View details</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* OBSERVATION DETAIL MODAL */}
      {selectedObservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-xl space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#0284C7]/10 text-[#0284C7] border border-[#0284C7]/20">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-[#0B132B]">
                  {selectedObservation.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedObservation(null)}
                className="text-xs text-[#64748B] hover:text-[#0B132B] p-1"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-sm text-[#64748B] leading-relaxed">
              {selectedObservation.explanation}
            </p>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
              <div className="text-xs">
                <span className="font-semibold text-[#0B132B]">Observed Trend: </span>
                <span className="text-[#64748B]">{selectedObservation.details.trend}</span>
              </div>
              <div className="text-xs">
                <span className="font-semibold text-[#0B132B]">Business Impact: </span>
                <span className="text-[#64748B]">{selectedObservation.details.impact}</span>
              </div>
              <div className="text-xs">
                <span className="font-semibold text-[#0B132B]">Underlying Signal: </span>
                <span className="text-[#64748B]">{selectedObservation.details.observedSignal}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedObservation(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0284C7] hover:bg-[#0369A1] text-white"
              >
                Acknowledged
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect Modal */}
      {connectModalPlatform && (
        <PlatformConnectModal
          platform={connectModalPlatform}
          connection={connections.find((c) => c.platform === connectModalPlatform)}
          onClose={() => setConnectModalPlatform(null)}
          onSuccess={async () => {
            await refreshConnections();
            loadData();
            setCurrentTab('intelligence');
          }}
        />
      )}
    </div>
  );
};
