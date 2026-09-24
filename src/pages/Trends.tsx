import React, { useState, useEffect } from 'react';
import { 
  RotateCw, 
  ArrowRight, 
  Zap, 
  Sparkles,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { api } from '../services/api';
import { TrendItem } from '../types';
import { EmptyState } from '../components/common/EmptyState';

export const Trends: React.FC = () => {
  const { setCurrentTab, connections } = useMedia();
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    api.getTrends()
      .then((data) => {
        setTrends(data.trends || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [connections]);

  const categories = ['all', 'Topics', 'Formats', 'Audience behaviour'];
  const filteredTrends = selectedCategory === 'all' 
    ? trends 
    : trends.filter((t) => t.category.toLowerCase() === selectedCategory.toLowerCase());

  const hasConnectedPlatforms = connections.some((c) => c.connected);

  const getVerificationBadge = (type?: string) => {
    if (type === 'Inferred from profile data' || type === 'Verified external trend') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          {type}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
        <Globe className="w-3 h-3 text-sky-600" />
        Macro Platform Trend
      </span>
    );
  };

  return (
    <div id="trends-page" className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#0B132B] tracking-tight">
            AI Trends &amp; Content Opportunity Engine
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Niche-specific opportunities with opening hooks, content concepts, and audience relevance.
          </p>
        </div>

        {/* Categories filter */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-[#E2E8F0]">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-white text-[#0B132B] shadow-2xs font-semibold'
                  : 'text-[#64748B] hover:text-[#0B132B]'
              }`}
            >
              {cat === 'all' ? 'All Trends' : cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-24 text-xs text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0]">
          <RotateCw className="w-5 h-5 animate-spin text-[#0284C7] mr-2" />
          Analyzing niche trends and content opportunities...
        </div>
      ) : trends.length === 0 ? (
        <EmptyState
          type={hasConnectedPlatforms ? 'no_data' : 'no_connection'}
          title={hasConnectedPlatforms ? 'Your account is connected, but no analyzable media data is currently available.' : 'Connect your account to unlock Trend Analytics.'}
          description="Trends are calculated by observing week-over-week velocity changes on your real published assets. Connect your accounts to start monitoring momentum."
          actionText="Manage Connections"
          onAction={() => setCurrentTab('connections')}
        />
      ) : (
        /* Trend Opportunity Cards */
        <div className="space-y-4">
          {filteredTrends.map((item) => (
            <div
              key={item.id}
              className="p-5 md:p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-2xs space-y-4 hover:border-[#0284C7]/40 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getVerificationBadge(item.trendType)}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#0B132B] text-white">
                      {item.recommendedPlatform || 'Cross-Platform'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-[#475569] border border-slate-200">
                      {item.suggestedFormat || item.category}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Velocity: {item.changeRate}
                    </span>
                  </div>

                  <h2 className="text-base md:text-lg font-bold text-[#0B132B] tracking-tight pt-1">
                    {item.name}
                  </h2>
                </div>

                <button
                  onClick={() => setCurrentTab('planner')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0284C7] text-white text-xs font-semibold hover:bg-[#0369A1] transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
                >
                  <span>Plan concept</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Core Concept & Hook */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  Content Concept
                </div>
                <p className="text-xs text-[#0B132B] font-medium leading-relaxed">
                  {item.contentConcept || item.explanation}
                </p>

                {item.suggestedHook && (
                  <div className="pt-2 border-t border-[#E2E8F0]">
                    <span className="text-[10px] font-bold text-[#0284C7] uppercase">Suggested Opening Hook: </span>
                    <span className="text-xs text-[#0B132B] italic font-serif">
                      "{item.suggestedHook}"
                    </span>
                  </div>
                )}
              </div>

              {/* Specification Grid: Relevance, Target Audience, Next Action */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                  <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    Reason for Relevance
                  </div>
                  <p className="text-[11px] text-[#475569]">
                    {item.reasonForRelevance || item.explanation}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                  <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    Target Audience Relevance
                  </div>
                  <p className="text-[11px] text-[#475569]">
                    {item.targetAudienceRelevance || 'Appeals to high-retention viewers seeking concrete insights.'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                    Recommended Next Action
                  </div>
                  <p className="text-[11px] text-[#0B132B] font-medium">
                    {item.recommendedNextAction || 'Record draft video or outline carousel slides.'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
