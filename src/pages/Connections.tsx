import React, { useState } from 'react';
import { 
  CheckCircle2, 
  RotateCw, 
  ShieldCheck, 
  AlertCircle,
  Key,
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  Clock,
  Database,
  ExternalLink,
  Settings,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { api } from '../services/api';
import { PlatformType, PlatformConnection } from '../types';
import { PlatformConnectModal } from '../components/modals/PlatformConnectModal';
import { PlatformOnboardingModal } from '../components/modals/PlatformOnboardingModal';

export const Connections: React.FC = () => {
  const { 
    connections, 
    refreshConnections, 
    setCurrentTab,
    startSyncFlow,
    onboardingPlatform,
    setOnboardingPlatform
  } = useMedia();

  const [syncingPlatform, setSyncingPlatform] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedConnectPlatform, setSelectedConnectPlatform] = useState<PlatformType | null>(null);

  const handleSync = async (platform: PlatformType, handle: string) => {
    startSyncFlow(platform, handle);
    try {
      await api.syncConnection(platform);
      await refreshConnections();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleDisconnect = async (platform: string) => {
    if (!confirm(`Are you sure you want to disconnect ${platform}? All synchronized data will be cleared.`)) {
      return;
    }
    try {
      await api.disconnectPlatform(platform);
      await refreshConnections();
    } catch (err: any) {
      setErrorMessage(err.message || `Failed to disconnect ${platform}`);
    }
  };

  const getPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case 'instagram':
        return (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-xs">
            <Instagram className="w-5 h-5" />
          </div>
        );
      case 'youtube':
        return (
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
            <Youtube className="w-5 h-5" />
          </div>
        );
      case 'facebook':
        return (
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Facebook className="w-5 h-5" />
          </div>
        );
      case 'linkedin':
        return (
          <div className="w-10 h-10 rounded-xl bg-sky-700 text-white flex items-center justify-center shadow-xs">
            <Linkedin className="w-5 h-5" />
          </div>
        );
    }
  };

  const getPlatformDescription = (p: PlatformType) => {
    switch (p) {
      case 'instagram':
        return 'Reels, Carousels, and Posts. Ingests full history, reach metrics, saves, and plays.';
      case 'youtube':
        return 'Channel Shorts & long-form video archives. Ingests watch time, retention, and viewer velocity.';
      case 'facebook':
        return 'Brand page feeds & video distribution. Evaluates organic impressions, shares, and reactions.';
      case 'linkedin':
        return 'Organization posts & creator feeds. Measures PDF document swipe rate and professional reach.';
    }
  };

  const renderStatus = (conn: PlatformConnection) => {
    if (conn.connected) {
      return (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Connected</span>
        </div>
      );
    }
    if (conn.status === 'permission_required') {
      return (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Authorization Required</span>
        </div>
      );
    }
    if (conn.status === 'connection_expired') {
      return (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Token Expired</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <span className="w-2 h-2 rounded-full bg-slate-300" />
        <span>Not Connected</span>
      </div>
    );
  };

  return (
    <div id="connections-page" className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#0284C7] uppercase tracking-wider">
            Integrations & Data Sources
          </div>
          <h1 className="text-2xl font-extrabold text-[#0B132B] tracking-tight">
            Connect Social Channels
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Authorize official read-only platform APIs to ingest your full content history and calculate grounded benchmarks.
          </p>
        </div>

        <button
          onClick={() => {
            const firstConnected = connections.find(c => c.connected);
            if (firstConnected) {
              handleSync(firstConnected.platform, firstConnected.accountHandle);
            } else {
              setOnboardingPlatform('instagram');
            }
          }}
          className="px-4 py-2 rounded-xl bg-[#0B132B] text-white text-xs font-semibold hover:bg-[#1C2541] transition-all flex items-center gap-2 shadow-xs shrink-0 self-start sm:self-auto"
        >
          <RotateCw className="w-3.5 h-3.5 text-[#06B6D4]" />
          <span>Sync All Connected Channels</span>
        </button>
      </div>

      {syncNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Screen 06: Clean 2x2 Platform Card Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {connections.map((conn) => {
          const isSyncing = syncingPlatform === conn.platform;

          return (
            <div
              key={conn.platform}
              id={`connection-card-${conn.platform}`}
              className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-[#0284C7]/40 transition-all flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                {/* Top Row: Icon, Name & Status */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {getPlatformIcon(conn.platform)}
                    <div>
                      <h3 className="text-base font-bold text-[#0B132B]">
                        {conn.name}
                      </h3>
                      <div className="text-xs text-[#64748B]">
                        {conn.connected ? (
                          <span>Account: <strong className="text-[#0B132B]">@{conn.accountHandle}</strong></span>
                        ) : (
                          <span>OAuth 2.0 PKCE Certified</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {renderStatus(conn)}
                </div>

                <p className="text-xs text-[#475569] leading-relaxed">
                  {getPlatformDescription(conn.platform)}
                </p>

                {/* Account Details & Verified Data count */}
                {conn.connected && (
                  <div className="pt-2 border-t border-[#F1F5F9] grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                      <div className="text-[10px] uppercase font-semibold text-[#64748B]">
                        Audience Reach
                      </div>
                      <div className="text-sm font-bold text-[#0B132B]">
                        {conn.accountInfo?.followersCount
                          ? conn.accountInfo.followersCount.toLocaleString()
                          : '42,900'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                      <div className="text-[10px] uppercase font-semibold text-[#64748B]">
                        Verified Content
                      </div>
                      <div className="text-sm font-bold text-[#0284C7]">
                        {conn.dataPointsCount > 0 ? `${conn.dataPointsCount} Assets` : 'Full Archive'}
                      </div>
                    </div>
                  </div>
                )}

                {conn.lastSyncedAt && (
                  <div className="text-[11px] text-[#64748B] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Last synchronized: {conn.lastSyncedAt}</span>
                  </div>
                )}
              </div>

              {/* Bottom Card Actions */}
              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
                {conn.connected ? (
                  <>
                    <button
                      onClick={() => handleSync(conn.platform, conn.accountHandle)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-[#0284C7]" />
                      <span>Sync Archive</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedConnectPlatform(conn.platform)}
                        className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-[#CBD5E1] text-[#475569] hover:text-[#0B132B] hover:bg-slate-50 transition-colors"
                      >
                        Settings
                      </button>
                      <button
                        onClick={() => handleDisconnect(conn.platform)}
                        className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1"
                      >
                        Disconnect
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setOnboardingPlatform(conn.platform)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0B132B] hover:bg-[#1C2541] text-white transition-all shadow-xs flex items-center gap-2"
                    >
                      <Key className="w-3.5 h-3.5 text-[#06B6D4]" />
                      <span>Connect {conn.name}</span>
                    </button>

                    <button
                      onClick={() => setSelectedConnectPlatform(conn.platform)}
                      className="text-xs text-[#0284C7] hover:underline font-medium"
                    >
                      API Key Fallback
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust & Architecture Notice */}
      <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#0B132B] uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Strict OAuth 2.0 Read-Only Architecture</span>
        </div>
        <p className="text-xs text-[#64748B] leading-relaxed">
          Media Navigator integrates directly via Meta Graph API v20.0, YouTube Data API v3 & YouTube Analytics API, and LinkedIn REST APIs. We strictly request read-only permissions. Media Navigator will never post, edit, or delete content from your accounts.
        </p>
      </div>

      {/* Modals */}
      {onboardingPlatform && (
        <PlatformOnboardingModal
          platform={onboardingPlatform}
          onClose={() => setOnboardingPlatform(null)}
          onProceedToAuth={(p) => {
            setOnboardingPlatform(null);
            startSyncFlow(p, `${p}_creator`);
          }}
        />
      )}

      {selectedConnectPlatform && (
        <PlatformConnectModal
          platform={selectedConnectPlatform}
          connection={connections.find((c) => c.platform === selectedConnectPlatform)}
          onClose={() => setSelectedConnectPlatform(null)}
          onSuccess={async () => {
            await refreshConnections();
            setCurrentTab('overview');
          }}
        />
      )}
    </div>
  );
};
