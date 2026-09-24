import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  ExternalLink, 
  Copy, 
  Check, 
  Calendar, 
  ArrowRight, 
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
  Share2
} from 'lucide-react';
import { NormalizedMedia, PostAIDiagnosis } from '../../types';
import { api } from '../../services/api';
import { useMedia } from '../../context/MediaContext';

interface PostAIDiagnosisModalProps {
  media: NormalizedMedia | null;
  onClose: () => void;
}

export const PostAIDiagnosisModal: React.FC<PostAIDiagnosisModalProps> = ({
  media,
  onClose,
}) => {
  const { setCurrentTab } = useMedia();
  const [diagnosis, setDiagnosis] = useState<PostAIDiagnosis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedHook, setCopiedHook] = useState(false);

  useEffect(() => {
    if (!media) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    api.diagnosePostAI(media.id)
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
  }, [media]);

  if (!media) return null;

  const handleCopyHook = () => {
    if (!diagnosis?.suggestedHookAlternative) return;
    navigator.clipboard.writeText(diagnosis.suggestedHookAlternative);
    setCopiedHook(true);
    setTimeout(() => setCopiedHook(false), 2000);
  };

  const handleGoToPlanner = () => {
    onClose();
    setCurrentTab('planner');
  };

  const isWorking = diagnosis?.status === 'working';
  const isUnderperforming = diagnosis?.status === 'underperforming';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs font-sans overflow-y-auto">
      <div className="w-full max-w-3xl my-6 bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 md:px-6 md:py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#0284C7] to-[#06B6D4] flex items-center justify-center text-white shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0B132B] tracking-tight">
                  AI Post Diagnostic
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-[#475569] border border-slate-200">
                  {media.platform}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-[#0284C7] border border-sky-200">
                  {media.contentType}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B]">
                Algorithmic retention analysis &amp; performance diagnosis
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#64748B] hover:text-[#0B132B] hover:bg-slate-100 transition-colors"
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
              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[#0B132B]/80 text-white backdrop-blur-xs">
                {media.contentType}
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
              <div className="grid grid-cols-4 gap-2 pt-1 text-center">
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
              <RotateCw className="w-7 h-7 text-[#0284C7] animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#0B132B]">
                  Conducting Forensic AI Analysis with Gemini 3.8 Flash...
                </p>
                <p className="text-[11px] text-[#64748B]">
                  Benchmarking hook retention, interaction velocity, and browse distribution factors.
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
                  api.diagnosePostAI(media.id)
                    .then((d) => {
                      setDiagnosis(d);
                      setLoading(false);
                    })
                    .catch((err) => {
                      setError(err.message || 'Retry failed');
                      setLoading(false);
                    });
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700"
              >
                Retry Diagnosis
              </button>
            </div>
          )}

          {/* Diagnosis Results */}
          {diagnosis && !loading && (
            <div className="space-y-5">
              
              {/* Status & Headline Banner */}
              <div
                className={`p-4 md:p-5 rounded-2xl border ${
                  isWorking
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : isUnderperforming
                    ? 'bg-amber-50/80 border-amber-200'
                    : 'bg-sky-50/60 border-sky-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold ${
                        isWorking
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : isUnderperforming
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-[#0284C7] text-white shadow-2xs'
                      }`}
                    >
                      {isWorking ? (
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

                  <span className="text-[10px] text-[#64748B] font-medium">
                    Diagnostic Source: <strong>{diagnosis.source}</strong>
                  </span>
                </div>

                <h4 className="text-sm md:text-base font-bold text-[#0B132B] tracking-tight">
                  {diagnosis.headline}
                </h4>

                <p className="text-xs text-[#334155] leading-relaxed mt-1.5 font-medium">
                  {diagnosis.executiveSummary}
                </p>
              </div>

              {/* CORE BREAKDOWN: WHY IT'S WORKING vs WHY IT WASN'T WORKING */}
              {isWorking && diagnosis.whyWorking && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Why This Post Is Working (Success Drivers)
                    </h4>
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
                        Engagement Triggers
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

              {!isWorking && diagnosis.whyNotWorking && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                      Why This Post Wasn't Working (Friction Diagnosis)
                    </h4>
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

              {/* Metric Breakdown Grid */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  Detailed Metric Health &amp; Interaction Velocity
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
                      Suggested Hook Alternative (Ready to Test)
                    </span>
                    <button
                      onClick={handleCopyHook}
                      className="px-2.5 py-1 rounded-lg bg-white border border-sky-200 text-[#0284C7] hover:bg-sky-50 text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition-all"
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
                    Actionable Next Steps (To Replicate or Revise)
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
        <div className="p-4 px-6 border-t border-[#E2E8F0] bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-[#64748B]">
            Grounding: Verified platform API counts &amp; algorithm pattern recognition
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#0B132B] hover:bg-slate-200/60 transition-colors"
            >
              Close
            </button>

            <button
              onClick={handleGoToPlanner}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-2xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Schedule Revised Test</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
