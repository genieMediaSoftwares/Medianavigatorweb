import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  RotateCw, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { api } from '../services/api';
import { NormalizedMedia } from '../types';
import { EmptyState } from '../components/common/EmptyState';

export const Analytics: React.FC = () => {
  const { selectedPlatform, setCurrentTab, connections } = useMedia();
  const [mediaList, setMediaList] = useState<NormalizedMedia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getMedia(selectedPlatform)
      .then((data) => {
        setMediaList(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedPlatform, connections]);

  const hasConnectedPlatforms = connections.some((c) => c.connected);

  // Group by content type
  const formatStats = mediaList.reduce((acc, curr) => {
    const type = curr.contentType || 'Post';
    if (!acc[type]) {
      acc[type] = { count: 0, totalEngagement: 0, totalViews: 0, totalInteractions: 0 };
    }
    acc[type].count += 1;
    acc[type].totalEngagement += curr.engagementRate;
    acc[type].totalViews += (curr.views || 0);
    acc[type].totalInteractions += (curr.likes + curr.comments + (curr.shares || 0));
    return acc;
  }, {} as Record<string, { count: number; totalEngagement: number; totalViews: number; totalInteractions: number }>);

  const formatBreakdown = Object.entries(formatStats).map(([format, stats]) => ({
    format: format.toUpperCase(),
    count: stats.count,
    engagement: (stats.totalEngagement / stats.count).toFixed(2) + '%',
    avgViews: Math.round(stats.totalViews / stats.count),
    totalInteractions: stats.totalInteractions,
    share: ((stats.count / mediaList.length) * 100).toFixed(0) + '%',
  }));

  return (
    <div id="analytics-page" className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#0B132B] tracking-tight">
            Analytics Overview
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Real format analytics computed strictly from verified connected assets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentTab('timing')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#CBD5E1] text-[#475569] hover:text-[#0B132B] hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Timing Matrix →
          </button>
          <button
            onClick={() => setCurrentTab('crossplatform')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0284C7] hover:bg-[#0369A1] text-white transition-colors shadow-2xs"
          >
            Cross-Platform View →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-24 text-xs text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0]">
          <RotateCw className="w-5 h-5 animate-spin text-[#0284C7] mr-2" />
          Calculating real-world format performance...
        </div>
      ) : mediaList.length === 0 ? (
        <EmptyState
          type={hasConnectedPlatforms ? 'no_data' : 'no_connection'}
          title={hasConnectedPlatforms ? 'Your account is connected, but no analyzable media data is currently available.' : 'Connect your account to unlock Media Analytics.'}
          description="Analytics are derived strictly from your verified live content. Connect Instagram, Facebook, YouTube, or LinkedIn to inspect real engagement rates and format distribution."
          actionText="Manage Platform Connections"
          onAction={() => setCurrentTab('connections')}
        />
      ) : (
        <>
          {/* Format Resonancy Matrix */}
          <section className="p-6 md:p-8 rounded-3xl bg-white border border-[#E2E8F0] shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#0284C7]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  Observed Format Performance
                </span>
              </div>
              <span className="text-xs text-[#64748B]">
                Evaluated from <strong>{mediaList.length}</strong> verified assets
              </span>
            </div>

            <div className="space-y-4">
              {formatBreakdown.map((item) => (
                <div
                  key={item.format}
                  className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 hover:border-[#0284C7]/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0B132B]">{item.format} ({item.count} items)</span>
                    <span className="text-xs font-mono font-bold text-emerald-700">
                      {item.engagement} avg engagement
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-[#0284C7] rounded-full transition-all"
                      style={{ width: item.share }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1">
                    <span>Share of catalog: {item.share} · Avg views: <strong className="text-[#0B132B]">{item.avgViews.toLocaleString()}</strong></span>
                    <span>Total interactions: <strong className="text-[#0B132B]">{item.totalInteractions.toLocaleString()}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Direct Intelligence Action */}
          <section className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#0B132B]">
                Inspect Individual Assets
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Review specific top-performing and underperforming assets with grounded explanations.
              </p>
            </div>
            <button
              onClick={() => setCurrentTab('content')}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#0284C7] hover:bg-[#0369A1] text-white transition-colors flex items-center gap-1.5 shadow-2xs shrink-0"
            >
              <span>Open Content Library</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </section>
        </>
      )}
    </div>
  );
};
