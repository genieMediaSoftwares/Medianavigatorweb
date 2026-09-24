import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  XCircle,
  Key,
  RotateCw,
  Instagram,
  Facebook,
  Youtube,
  Linkedin
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { api } from '../services/api';
import { NormalizedMedia, PlatformType } from '../types';
import { PlatformConnectModal } from '../components/modals/PlatformConnectModal';
import { EmptyState } from '../components/common/EmptyState';

export const CrossPlatform: React.FC = () => {
  const { setCurrentTab, setSelectedPlatform, connections, refreshConnections } = useMedia();
  const [mediaList, setMediaList] = useState<NormalizedMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectModalPlatform, setConnectModalPlatform] = useState<PlatformType | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getMedia()
      .then((data) => {
        setMediaList(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [connections]);

  const getPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case 'instagram': return <Instagram className="w-5 h-5 text-pink-600" />;
      case 'facebook': return <Facebook className="w-5 h-5 text-blue-600" />;
      case 'youtube': return <Youtube className="w-5 h-5 text-red-600" />;
      case 'linkedin': return <Linkedin className="w-5 h-5 text-sky-700" />;
    }
  };

  const connectedList = connections.filter((c) => c.connected);
  const connectedWithData = connectedList.filter((c) => 
    mediaList.some((m) => m.platform === c.platform)
  );

  return (
    <div id="cross-platform-page" className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-[#0B132B] tracking-tight">
          Cross-Platform Performance
        </h1>
        <p className="text-xs text-[#64748B] mt-1">
          Comparative analytics evaluated strictly across connected channels with verified data.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-24 text-xs text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0]">
          <RotateCw className="w-5 h-5 animate-spin text-[#0284C7] mr-2" />
          Comparing verified cross-platform metrics...
        </div>
      ) : (
        <>
          {/* 4 Platform Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {connections.map((conn) => {
              const platformMedia = mediaList.filter((m) => m.platform === conn.platform);
              const hasData = conn.connected && platformMedia.length > 0;
              const avgEng = hasData
                ? (platformMedia.reduce((a, b) => a + b.engagementRate, 0) / platformMedia.length).toFixed(2)
                : null;
              const totalViews = hasData
                ? platformMedia.reduce((a, b) => a + (b.views || 0), 0)
                : null;

              return (
                <div
                  key={conn.platform}
                  id={`cross-platform-card-${conn.platform}`}
                  className={`p-5 rounded-2xl bg-white border transition-all flex flex-col justify-between space-y-4 shadow-2xs ${
                    conn.connected ? 'border-[#E2E8F0] hover:border-[#0284C7]/40' : 'border-[#E2E8F0]/70 opacity-80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getPlatformIcon(conn.platform)}
                        <span className="text-sm font-bold text-[#0B132B]">
                          {conn.name}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          conn.connected
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-[#64748B] border border-slate-200'
                        }`}
                      >
                        {conn.connected ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            Connected
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            Not connected
                          </>
                        )}
                      </span>
                    </div>

                    {hasData ? (
                      <div className="space-y-2 pt-1">
                        <div className="text-[10px] uppercase font-semibold text-[#64748B]">
                          Observed Performance
                        </div>
                        <div className="text-xl font-bold text-[#0B132B]">
                          {avgEng}% <span className="text-xs font-normal text-[#64748B]">avg. engagement</span>
                        </div>
                        <div className="text-xs text-[#64748B]">
                          Based on <strong>{platformMedia.length}</strong> verified posts
                          {totalViews !== null && totalViews > 0 && ` (${totalViews.toLocaleString()} total views)`}.
                        </div>
                      </div>
                    ) : conn.connected ? (
                      <div className="text-xs text-[#64748B] py-2">
                        Account connected (<strong>{conn.accountHandle}</strong>), but no analyzable posts found.
                      </div>
                    ) : (
                      <div className="text-xs text-[#64748B] py-2">
                        Connect {conn.name} to compare performance against your other channels.
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                    {hasData ? (
                      <button
                        onClick={() => {
                          setSelectedPlatform(conn.platform);
                          setCurrentTab('content');
                        }}
                        className="text-xs font-semibold text-[#0284C7] hover:underline inline-flex items-center gap-1"
                      >
                        <span>Filter {conn.name}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setConnectModalPlatform(conn.platform)}
                        className="text-xs font-bold text-[#0284C7] hover:text-[#0369A1] inline-flex items-center gap-1.5"
                      >
                        <Key className="w-3 h-3" />
                        <span>{conn.connected ? 'Re-sync' : 'Connect'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cross-Platform Intelligence Banner */}
          {connectedWithData.length >= 2 ? (
            <section className="p-6 md:p-8 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#0284C7]/10 text-[#0284C7] border border-[#0284C7]/20">
                  <Sparkles className="w-4 h-4" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Comparative Intelligence
                </span>
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-[#0B132B] tracking-tight leading-snug">
                Cross-channel patterns across {connectedWithData.map((c) => c.name).join(' and ')}.
              </h2>

              <p className="text-sm text-[#64748B] leading-relaxed max-w-3xl">
                Evaluating {mediaList.length} total verified assets. Each platform demonstrates distinct velocity curves: compare format lengths and engagement ratios between your active channels to identify repurposing opportunities.
              </p>

              <div className="pt-2">
                <button
                  id="explore-platform-patterns-button"
                  onClick={() => setCurrentTab('intelligence')}
                  className="py-2.5 px-5 rounded-xl text-xs font-semibold bg-[#0284C7] hover:bg-[#0369A1] text-white transition-colors inline-flex items-center gap-2 shadow-2xs"
                >
                  <span>Ask Media Navigator about cross-channel trends</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </section>
          ) : (
            <EmptyState
              type={connectedList.length > 0 ? 'no_data' : 'no_connection'}
              title="Connect at least 2 platforms to enable cross-channel comparison."
              description="Media Navigator compares real performance metrics across your connected networks. Disconnected platforms are never filled with simulated or estimated data."
              actionText="Manage Platform Connections"
              onAction={() => setCurrentTab('connections')}
            />
          )}
        </>
      )}

      {connectModalPlatform && (
        <PlatformConnectModal
          platform={connectModalPlatform}
          connection={connections.find((c) => c.platform === connectModalPlatform)}
          onClose={() => setConnectModalPlatform(null)}
          onSuccess={async () => {
            await refreshConnections();
          }}
        />
      )}
    </div>
  );
};
