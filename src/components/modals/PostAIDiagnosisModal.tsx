import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  ExternalLink, 
  Copy, 
  Check, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Heart, 
  MessageSquare, 
  RotateCw,
  AlertTriangle,
  Zap,
  Target,
  Clock,
  Layers,
  HelpCircle,
  Film,
  Play,
  Volume2,
  Award,
  ArrowRight,
  Share2
} from 'lucide-react';
import { NormalizedMedia, PostAIDiagnosis } from '../../types';
import { api } from '../../services/api';
import { useMedia } from '../../app/providers/MediaContext';

interface PostAIDiagnosisModalProps {
  media: NormalizedMedia | null;
  forcedStatus?: 'working' | 'underperforming' | 'average';
  initialTab?: DiagnosisTab;
  onClose: () => void;
}

export type DiagnosisTab = 'working' | 'not_working' | 'video' | 'comparison';

export const PostAIDiagnosisModal: React.FC<PostAIDiagnosisModalProps> = ({
  media,
  forcedStatus,
  initialTab,
  onClose,
}) => {
  const { setCurrentTab } = useMedia();
  const [diagnosis, setDiagnosis] = useState<PostAIDiagnosis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedHook, setCopiedHook] = useState(false);
  const [copiedVideoHook, setCopiedVideoHook] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  // Active perspective tab: prioritize initialTab, otherwise forcedStatus
  const isVideoFormat = media?.contentType === 'reel' || media?.contentType === 'video' || media?.contentType === 'short';
  
  const [activeTab, setActiveTab] = useState<DiagnosisTab>(
    initialTab || (
      forcedStatus === 'underperforming' 
        ? 'not_working' 
        : (forcedStatus === 'working' ? 'working' : (isVideoFormat ? 'video' : 'working'))
    )
  );

  useEffect(() => {
    if (!media) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    // Initial load: keep active tab in sync with initialTab or forcedStatus
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (forcedStatus === 'underperforming') {
      setActiveTab('not_working');
    } else {
      setActiveTab('working');
    }

    api.diagnosePostAI(media.id, media, forcedStatus)
      .then((data) => {
        if (isMounted) {
          setDiagnosis(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Diagnosis failed:', err);
          setError(err.message || 'Failed to generate AI diagnosis');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [media, forcedStatus, initialTab]);

  if (!media) return null;

  const handleCopyHook = () => {
    if (!diagnosis?.suggestedHookAlternative) return;
    navigator.clipboard.writeText(diagnosis.suggestedHookAlternative);
    setCopiedHook(true);
    setTimeout(() => setCopiedHook(false), 2000);
  };

  const handleCopyVideoHook = () => {
    const hook = diagnosis?.videoAnalysis?.testedAlternativeHook || diagnosis?.suggestedHookAlternative;
    if (!hook) return;
    navigator.clipboard.writeText(hook);
    setCopiedVideoHook(true);
    setTimeout(() => setCopiedVideoHook(false), 2000);
  };

  const handleReanalyzeWholeVideo = async () => {
    if (reanalyzing) return;
    setReanalyzing(true);
    try {
      const refreshed = await api.diagnosePostAI(media.id, media, activeTab === 'not_working' ? 'underperforming' : 'working');
      if (refreshed) {
        setDiagnosis(refreshed);
      }
    } catch (err) {
      console.warn('Re-analysis error:', err);
    } finally {
      setReanalyzing(false);
    }
  };

  const handleGoToPlanner = () => {
    onClose();
    setCurrentTab('planner');
  };

  const hookScore = diagnosis?.videoAnalysis?.hookScore ?? 0;
  const hookQuality = diagnosis?.videoAnalysis?.hookQuality ?? '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs font-sans overflow-y-auto">
      <div className="w-full max-w-4xl my-6 bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="p-4 md:px-6 md:py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0284C7] to-[#06B6D4] flex items-center justify-center text-white shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0B132B] tracking-tight">
                  Forensic AI Post &amp; Video Diagnostic
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-[#475569] border border-slate-200">
                  {media.platform}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-[#0284C7] border border-sky-200">
                  {media.contentType}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B]">
                Real-time algorithmic breakdown &amp; retention intelligence
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#64748B] hover:text-[#0B132B] hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 md:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Post Snippet Card */}
          <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col sm:flex-row items-start gap-4">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-200">
              <img
                src={media.thumbnailUrl}
                alt={media.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=600&q=80';
                }}
              />
              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[#0B132B]/80 text-white backdrop-blur-xs flex items-center gap-1">
                {isVideoFormat && <Play className="w-2 h-2 fill-white" />}
                <span>{media.contentType}</span>
              </div>
            </div>

            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-[#0B132B] leading-snug line-clamp-2">
                  {media.title}
                </h3>
                {media.mediaUrl && (
                  <a
                    href={media.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-[#64748B] hover:text-[#0284C7] shrink-0"
                    title="Open on platform"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              {media.caption && (
                <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed italic">
                  "{media.caption}"
                </p>
              )}

              {/* Exact Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-center">
                <div className="p-1.5 rounded-lg bg-white border border-[#E2E8F0]">
                  <div className="text-[9px] font-bold uppercase text-[#64748B] flex items-center justify-center gap-1">
                    <Eye className="w-2.5 h-2.5 text-[#0284C7]" /> Views
                  </div>
                  <div className="text-xs font-bold text-[#0B132B] font-mono">
                    {media.views > 0 ? media.views.toLocaleString() : '—'}
                  </div>
                </div>

                <div className="p-1.5 rounded-lg bg-white border border-[#E2E8F0]">
                  <div className="text-[9px] font-bold uppercase text-[#64748B] flex items-center justify-center gap-1">
                    <Heart className="w-2.5 h-2.5 text-pink-500" /> Likes
                  </div>
                  <div className="text-xs font-bold text-[#0B132B] font-mono">
                    {media.likes.toLocaleString()}
                  </div>
                </div>

                <div className="p-1.5 rounded-lg bg-white border border-[#E2E8F0]">
                  <div className="text-[9px] font-bold uppercase text-[#64748B] flex items-center justify-center gap-1">
                    <MessageSquare className="w-2.5 h-2.5 text-amber-500" /> Comments
                  </div>
                  <div className="text-xs font-bold text-[#0B132B] font-mono">
                    {media.comments.toLocaleString()}
                  </div>
                </div>

                <div className="p-1.5 rounded-lg bg-white border border-[#E2E8F0]">
                  <div className="text-[9px] font-bold uppercase text-[#64748B] flex items-center justify-center gap-1">
                    <Share2 className="w-2.5 h-2.5 text-emerald-600" /> Saves/Shares
                  </div>
                  <div className="text-xs font-bold text-[#0B132B] font-mono">
                    {media.shares.toLocaleString()}
                  </div>
                </div>

                <div className="p-1.5 rounded-lg bg-white border border-[#E2E8F0]">
                  <div className="text-[9px] font-bold uppercase text-[#64748B] flex items-center justify-center gap-1">
                    <Zap className="w-2.5 h-2.5 text-purple-500" /> Eng Rate
                  </div>
                  <div className="text-xs font-bold text-[#0284C7] font-mono">
                    {media.engagementRate}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-12 text-center space-y-3 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
              <RotateCw className="w-8 h-8 text-[#0284C7] animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#0B132B]">
                  Executing Real-Time Forensic AI Analysis...
                </p>
                <p className="text-xs text-[#64748B]">
                  Benchmarking whole video retention dynamics, 0-3s hook friction, and algorithmic feed expansion.
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="p-6 text-center space-y-3 bg-rose-50 rounded-2xl border border-rose-200 text-rose-800 text-xs">
              <AlertTriangle className="w-6 h-6 text-rose-600 mx-auto" />
              <p className="font-semibold">{error}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  api.diagnosePostAI(media.id, media, forcedStatus)
                    .then((d) => {
                      setDiagnosis(d);
                      setLoading(false);
                    })
                    .catch((err) => {
                      setError(err.message || 'Retry failed');
                      setLoading(false);
                    });
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 cursor-pointer"
              >
                Retry Diagnosis
              </button>
            </div>
          )}

          {/* Diagnosis Results */}
          {diagnosis && !loading && (
            <div className="space-y-5">
              
              {/* Status & Headline Banner */}
              <div className="p-4 md:p-5 rounded-2xl border bg-gradient-to-r from-slate-50 via-sky-50/50 to-indigo-50/40 border-[#CBD5E1]">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold ${
                        diagnosis.status === 'working'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : diagnosis.status === 'underperforming'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-[#0284C7] text-white shadow-2xs'
                      }`}
                    >
                      {diagnosis.status === 'working' ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      <span>{diagnosis.statusBadge}</span>
                    </span>

                    <span className="text-xs font-mono font-bold text-[#0B132B] bg-white px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                      {diagnosis.baselineComparison}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800 text-[10px] font-bold">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      {diagnosis.ai && (diagnosis.ai.status === 'ran' || diagnosis.ai.status === 'cached') ? <>AI interpretation: <strong>{diagnosis.ai.status === 'cached' ? 'cached result' : 'generated now'}</strong></> : <>AI interpretation: <strong>not available</strong></>}
                    </span>
                  </div>
                </div>

                <h4 className="text-sm md:text-base font-bold text-[#0B132B] tracking-tight">
                  {diagnosis.headline}
                </h4>

                <p className="text-xs text-[#334155] leading-relaxed mt-1.5 font-medium">
                  {diagnosis.executiveSummary}
                </p>

                {diagnosis.ai && diagnosis.ai.status !== 'ran' && diagnosis.ai.status !== 'cached' && (
                  <p className="mt-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                    AI interpretation was not generated{diagnosis.ai.reason ? ` (${diagnosis.ai.reason})` : ''}. Everything shown here is measured from your synced data.
                  </p>
                )}
                {diagnosis.limitations && diagnosis.limitations.length > 0 && (
                  <ul className="mt-2 text-[11px] text-slate-500 list-disc pl-4 space-y-0.5">
                    {diagnosis.limitations.map((l, i) => <li key={i}>{l}</li>)}
                  </ul>
                )}
              </div>

              {/* INTERACTIVE PERSPECTIVE SWITCHER BAR */}
              <div className="p-1 rounded-2xl bg-[#F1F5F9] border border-[#CBD5E1] flex flex-wrap sm:flex-nowrap items-center gap-1 shadow-inner">
                <button
                  id="tab-why-its-working"
                  onClick={() => setActiveTab('working')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'working'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-[#475569] hover:text-[#0B132B] hover:bg-white/60'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Why It's in Top (What Clicked)</span>
                </button>

                <button
                  id="tab-why-not-working"
                  onClick={() => setActiveTab('not_working')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'not_working'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-[#475569] hover:text-[#0B132B] hover:bg-white/60'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>What to Improve</span>
                </button>

                <button
                  id="tab-whole-video-analysis"
                  onClick={() => setActiveTab('video')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'video'
                      ? 'bg-gradient-to-r from-[#0284C7] to-[#7C3AED] text-white shadow-xs'
                      : 'text-[#475569] hover:text-[#0B132B] hover:bg-white/60'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Deep Analysis</span>
                </button>

                <button
                  id="tab-dual-comparison"
                  onClick={() => setActiveTab('comparison')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'comparison'
                      ? 'bg-[#0B132B] text-white shadow-xs'
                      : 'text-[#475569] hover:text-[#0B132B] hover:bg-white/60'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Dual Comparison</span>
                </button>
              </div>

              {/* TAB 1: WHY IT'S IN TOP (WHAT CLICKED) */}
              {activeTab === 'working' && diagnosis.whyWorking && (
                <div className="space-y-3.5 animate-fadeIn">
                  {/* 5-8 Short Highlights of What Clicked */}
                  {diagnosis.topSuccessDrivers && diagnosis.topSuccessDrivers.length > 0 && (
                    <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          Core Drivers: What Clicked &amp; Drove This to the Top (5-8 Key Factors)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200/70 text-emerald-900">
                          Verified Top Signals
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {diagnosis.topSuccessDrivers.map((point, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-white/95 border border-emerald-200/70 shadow-2xs flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="text-emerald-950 font-medium leading-relaxed">
                              {point}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        Detailed Algorithmic Momentum &amp; Pacing Factors
                      </h4>
                    </div>
                    <span className="text-[11px] text-[#64748B]">
                      Factors that instructed the algorithm to reward this post
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#0284C7] flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        Hook Effectiveness (0-3s)
                      </div>
                      <p className="text-[#334155] leading-relaxed">
                        {diagnosis.whyWorking.hookEffectiveness}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Retention &amp; Pacing
                      </div>
                      <p className="text-[#334155] leading-relaxed">
                        {diagnosis.whyWorking.retentionDrivers}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-pink-600 flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        Audience Interaction Triggers
                      </div>
                      <p className="text-[#334155] leading-relaxed">
                        {diagnosis.whyWorking.audienceInteractionTriggers}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        Algorithmic Feed Signal
                      </div>
                      <p className="text-[#334155] leading-relaxed">
                        {diagnosis.whyWorking.algorithmDistributionSignal}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: WHAT TO IMPROVE */}
              {activeTab === 'not_working' && diagnosis.whyNotWorking && (
                <div className="space-y-3.5 animate-fadeIn">
                  {/* 5-8 Short Highlights of What to Improve */}
                  {diagnosis.bottomImprovementPoints && diagnosis.bottomImprovementPoints.length > 0 && (
                    <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Actionable Fixes: What Needs Improvement (5-8 Specific Recommendations)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200/70 text-amber-900">
                          Priority Remedies
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {diagnosis.bottomImprovementPoints.map((point, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-white/95 border border-amber-200/70 shadow-2xs flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="text-amber-950 font-medium leading-relaxed">
                              {point}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                        Friction Points &amp; Missed Algorithmic Triggers
                      </h4>
                    </div>
                    <span className="text-[11px] text-[#64748B]">
                      Where viewer attention decayed and how to revise the asset
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        Viewer Drop-off Point
                      </div>
                      <p className="text-[#334155] leading-relaxed">
                        {diagnosis.whyNotWorking.dropoffDiagnosis}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        Hook Friction (0-3s)
                      </div>
                      <p className="text-[#334155] leading-relaxed">
                        {diagnosis.whyNotWorking.hookFriction}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3" />
                        Value Proposition Gap
                      </div>
                      <p className="text-[#334155] leading-relaxed">
                        {diagnosis.whyNotWorking.valuePropositionGap}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        Formatting &amp; Pacing Mismatch
                      </div>
                      <p className="text-[#334155] leading-relaxed">
                        {diagnosis.whyNotWorking.formattingMismatch}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: WHOLE VIDEO AI ANALYSIS (DEEP RETENTION & TIMELINE) */}
              {activeTab === 'video' && diagnosis.videoAnalysis && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Hook Score & Quality Hero Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                          Short-Form Hook Quality &amp; Scroll-Stop Audit
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          {hookQuality}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {diagnosis.videoAnalysis.retentionDropoffPrediction}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 flex items-center gap-3 shrink-0">
                      <div className="text-center">
                        <div className="text-2xl font-black text-white font-mono leading-none">
                          {hookScore}<span className="text-xs text-slate-400">/100</span>
                        </div>
                        <div className="text-[9px] uppercase tracking-wider text-slate-300 font-bold mt-1">
                          Hook Score
                        </div>
                      </div>
                      <div className="w-24 bg-white/20 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            hookScore >= 80 ? 'bg-emerald-400' : (hookScore >= 65 ? 'bg-amber-400' : 'bg-rose-400')
                          }`}
                          style={{ width: `${Math.min(100, Math.max(10, hookScore))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECOND-BY-SECOND TIMELINE RETENTION CURVE */}
                  <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#0B132B] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#0284C7]" />
                        Second-By-Second Timeline Retention Curve
                      </div>
                      <span className="text-[10px] text-[#64748B]">
                        Viewer decay benchmark across critical watch thresholds
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                      {(diagnosis.videoAnalysis.timelineCurve || []).map((step, idx) => (
                        <div 
                          key={idx} 
                          className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col justify-between space-y-2 relative overflow-hidden"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0284C7]/10 text-[#0284C7]">
                              {step.secondRange}
                            </span>
                            <span className="text-[10px] font-bold text-[#0B132B] font-mono">
                              {step.retentionEstimate}
                            </span>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-[#0B132B]">{step.stage}</div>
                            <p className="text-[10px] text-[#64748B] leading-relaxed mt-0.5">
                              {step.actionableInsight}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Audio Cadence, Subtitles & Kinetic Text */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#0284C7] flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-[#0284C7]" />
                        Audio Cadence &amp; Voiceover Pacing
                      </div>
                      <p className="text-[#334155] leading-relaxed">
                        {diagnosis.videoAnalysis.audioPacingFeedback}
                      </p>
                      <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-200 text-[11px] text-[#0284C7] font-medium">
                        💡 <strong>Sound-Off Tip: </strong>{diagnosis.videoAnalysis.soundOffOptimizationTip}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-purple-600" />
                        Kinetic Subtitle &amp; Overlay Tactics
                      </div>
                      <ul className="space-y-1.5 text-[#334155]">
                        {diagnosis.videoAnalysis.kineticTextRecommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-[#0284C7] font-bold">✓</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Viral Replication Concept Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        Viral Replication Blueprint
                      </span>
                      <button
                        onClick={handleCopyVideoHook}
                        className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 text-[11px] font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        {copiedVideoHook ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Concept</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-[#0B132B] font-medium leading-relaxed">
                      {diagnosis.videoAnalysis.viralReplicationConcept}
                    </p>
                    {diagnosis.videoAnalysis.testedAlternativeHook && (
                      <div className="pt-1 text-[11px] text-[#475569]">
                        <strong>Alternative Hook Line: </strong>
                        <span className="italic font-serif text-[#0B132B]">
                          "{diagnosis.videoAnalysis.testedAlternativeHook}"
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'video' && !diagnosis.videoAnalysis && (
                <div className="text-xs text-[#334155] bg-slate-50 border border-slate-200 rounded-xl p-4 animate-fadeIn space-y-2">
                  <p className="font-semibold text-[#0B132B]">Video retention analysis is not available for this post.</p>
                  <p>
                    The platform APIs connected here do not provide audience-retention curves, audio, or frame-level data, so no hook score or retention
                    curve is shown rather than estimating one. Use the measured metrics and the suggested hook alternative on the other tabs.
                  </p>
                </div>
              )}

              {(activeTab === 'working' && !diagnosis.whyWorking || activeTab === 'not_working' && !diagnosis.whyNotWorking || activeTab === 'comparison' && !(diagnosis.whyWorking && diagnosis.whyNotWorking)) && (
                <div className="text-xs text-[#334155] bg-slate-50 border border-slate-200 rounded-xl p-4 animate-fadeIn">
                  No AI breakdown is available for this view{diagnosis.status === 'working' && activeTab === 'not_working' ? ' (this post is performing above your typical level)' : diagnosis.status === 'underperforming' && activeTab === 'working' ? ' (this post is performing below your typical level)' : ''}.
                  The measured comparison against your own history is shown in the summary above.
                </div>
              )}

              {/* TAB 4: DUAL COMPARISON VIEW */}
              {activeTab === 'comparison' && diagnosis.whyWorking && diagnosis.whyNotWorking && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-fadeIn">
                  {/* Left Column: What Worked */}
                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      What Succeeded (Keep Doing)
                    </div>
                    <div className="space-y-2 text-[#334155]">
                      <div>
                        <strong className="text-emerald-900 block text-[10px] uppercase">Hook Strength:</strong>
                        <p>{diagnosis.whyWorking.hookEffectiveness}</p>
                      </div>
                      <div>
                        <strong className="text-emerald-900 block text-[10px] uppercase">Retention Drivers:</strong>
                        <p>{diagnosis.whyWorking.retentionDrivers}</p>
                      </div>
                      <div>
                        <strong className="text-emerald-900 block text-[10px] uppercase">Interaction Triggers:</strong>
                        <p>{diagnosis.whyWorking.audienceInteractionTriggers}</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Friction to Fix */}
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-wider">
                      <TrendingDown className="w-4 h-4 text-amber-600" />
                      Friction to Fix (Revise)
                    </div>
                    <div className="space-y-2 text-[#334155]">
                      <div>
                        <strong className="text-amber-900 block text-[10px] uppercase">Attention Dropoff:</strong>
                        <p>{diagnosis.whyNotWorking.dropoffDiagnosis}</p>
                      </div>
                      <div>
                        <strong className="text-amber-900 block text-[10px] uppercase">Hook Friction:</strong>
                        <p>{diagnosis.whyNotWorking.hookFriction}</p>
                      </div>
                      <div>
                        <strong className="text-amber-900 block text-[10px] uppercase">Pacing / Format Gap:</strong>
                        <p>{diagnosis.whyNotWorking.formattingMismatch}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Metric Breakdown Grid */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  Verified Metric Health &amp; Interaction Velocity
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#0B132B]">Views vs Baseline: </span>
                    <span className="text-[#64748B]">{diagnosis.metricBreakdown.viewsAnalysis}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#0B132B]">Engagement Health: </span>
                    <span className="text-[#64748B]">{diagnosis.metricBreakdown.engagementHealth}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#0B132B]">Comment Velocity: </span>
                    <span className="text-[#64748B]">{diagnosis.metricBreakdown.commentVelocity}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-[#0B132B]">Shareability: </span>
                    <span className="text-[#64748B]">{diagnosis.metricBreakdown.shareabilityAnalysis}</span>
                  </div>
                </div>
              </div>

              {/* Suggested Hook Alternative Callout */}
              {diagnosis.suggestedHookAlternative && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#0284C7] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Suggested Alternative Hook (Ready to Test)
                    </span>
                    <button
                      onClick={handleCopyHook}
                      className="px-2.5 py-1 rounded-lg bg-white border border-sky-200 text-[#0284C7] hover:bg-sky-50 text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                    >
                      {copiedHook ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Hook</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs font-serif italic text-[#0B132B] font-medium leading-relaxed">
                    "{diagnosis.suggestedHookAlternative}"
                  </p>
                </div>
              )}

              {/* Recommended Format & Timing */}
              {diagnosis.recommendedFormatAndTiming && (
                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-3 text-xs">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-700">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                      Recommended Format &amp; Timing
                    </div>
                    <div className="font-semibold text-[#0B132B]">
                      {diagnosis.recommendedFormatAndTiming}
                    </div>
                  </div>
                </div>
              )}

              {/* Actionable Next Steps Checklist */}
              {diagnosis.actionableChecklist && diagnosis.actionableChecklist.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                    Actionable Next Steps (Forensic Recommendations)
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {diagnosis.actionableChecklist.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs flex items-start gap-2.5"
                      >
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-[#0B132B] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="text-[#334155] leading-relaxed font-medium">
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 md:px-6 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <button
              onClick={handleReanalyzeWholeVideo}
              disabled={reanalyzing || loading}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-[#0B132B] font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <RotateCw className={`w-3.5 h-3.5 ${reanalyzing ? 'animate-spin text-[#0284C7]' : ''}`} />
              <span>{reanalyzing ? 'Analyzing Video Retention...' : 'Re-Run Whole Video Analysis'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGoToPlanner}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#CBD5E1] text-[#0B132B] font-semibold text-xs hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>Add to Content Planner</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-[#0B132B] hover:bg-[#1E293B] text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
