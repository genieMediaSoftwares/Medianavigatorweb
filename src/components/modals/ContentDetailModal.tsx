import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  TrendingUp, 
  Eye, 
  Share2, 
  Heart, 
  Clock, 
  ExternalLink,
  Bot,
  Bookmark,
  FlaskConical,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { NormalizedMedia } from '../../types';
import { api } from '../../services/api';
import { PostAIDiagnosisModal } from './PostAIDiagnosisModal';

interface ContentDetailModalProps {
  media: NormalizedMedia | null;
  onClose: () => void;
}

export const ContentDetailModal: React.FC<ContentDetailModalProps> = ({ media, onClose }) => {
  const [aiAnalysis, setAiAnalysis] = useState<{
    observedFact: string;
    possibleReason: string;
    actionableRecommendations: string[];
    answeredBy: string;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [savedToExperiment, setSavedToExperiment] = useState(false);
  const [showFullDiagnosis, setShowFullDiagnosis] = useState(false);

  if (!media) return null;

  const handleDeepDive = async () => {
    setIsAnalyzing(true);
    try {
      const res = await api.analyzeItemAI(media.id);
      setAiAnalysis(res);
    } catch (err) {
      console.error('Deep dive analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        id="content-detail-modal"
        className="w-full max-w-4xl bg-white border border-line-strong rounded-2xl shadow-2xl overflow-hidden my-6"
      >
        {/* Top Bar Header */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-canvas">
          <div className="flex items-center gap-2.5 text-xs text-muted">
            <span className="font-bold uppercase tracking-wider text-brand-600">
              {media.platform} {media.contentType}
            </span>
            <span aria-hidden="true">·</span>
            <span>Published {media.publishedAt}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 md:p-8">
          {/* Left Column: Media Preview & Caption */}
          <div className="md:col-span-5 space-y-4">
            <div className="relative aspect-[4/5] rounded-xl overflow-hidden border border-line bg-stone-100 group">
              <img
                src={media.thumbnailUrl}
                alt={media.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent opacity-90" />

              <div className="absolute bottom-3 left-3 right-3 text-white text-xs">
                <span className="px-2 py-0.5 rounded-md bg-brand-600 text-white font-bold text-xs uppercase tracking-wider mb-1.5 inline-block">
                  {media.contentType}
                </span>
                <p className="font-semibold line-clamp-2">{media.title}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-canvas border border-line space-y-1 text-xs">
              <span className="font-bold text-ink uppercase tracking-wider text-xs">
                Caption & Script
              </span>
              <p className="text-muted leading-relaxed italic">
                "{media.caption || media.title}"
              </p>
            </div>
          </div>

          {/* Right Column: Verified Metrics & Grounded AI Analysis */}
          <div className="md:col-span-7 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Headline number
                </span>
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  ● {media.primarySignal.value}
                </span>
              </div>
              <h2 className="text-lg font-bold text-ink tracking-tight">
                {media.title}
              </h2>
            </div>

            {/* 6 Key Verified Metrics */}
            <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-canvas border border-line">
              <div>
                <div className="text-xs uppercase font-semibold text-muted">Total Views</div>
                <div className="text-base font-extrabold text-ink">
                  {media.views.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase font-semibold text-muted">Unique Reach</div>
                <div className="text-base font-extrabold text-ink">
                  {media.reach.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase font-semibold text-muted">Engagement</div>
                <div className="text-base font-extrabold text-brand-600">
                  {media.engagementRate}%
                </div>
              </div>
              <div>
                <div className="text-xs uppercase font-semibold text-muted">Viral Shares</div>
                <div className="text-base font-extrabold text-ink">
                  {media.shares.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase font-semibold text-muted">Likes</div>
                <div className="text-base font-extrabold text-ink">
                  {media.likes.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase font-semibold text-muted">Comments</div>
                <div className="text-base font-extrabold text-ink">
                  {media.comments.toLocaleString()}
                </div>
              </div>
            </div>

            {/* AI Pattern Breakdown */}
            <div className="p-4 rounded-xl bg-brand-600/5 border border-brand-600/20 space-y-2">
              <div className="text-xs font-bold text-brand-600 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-brand-600" />
                Algorithmic Signal Explanation
              </div>
              <p className="text-xs text-ink leading-relaxed">
                <strong className="text-brand-600">Measured Observation: </strong>
                {media.explanation.observedFact}
              </p>
              {media.explanation.possibleReason && (
              <p className="text-xs text-body leading-relaxed">
                <strong className="text-muted">Grounded Hypothesis: </strong>
                {media.explanation.possibleReason}
              </p>)}
            </div>

            {/* Repeatable Success Elements */}
            {media.explanation.whatToRepeat.length > 0 && <div className="space-y-1.5">
              <div className="text-xs font-bold text-ink uppercase tracking-wider">
                Formula Elements to Repeat
              </div>
              <div className="space-y-1">
                {media.explanation.whatToRepeat.map((point, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-body">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>}

            {/* AI Deep Dive Result or Action */}
            <div className="pt-2 space-y-2.5">
              <button
                id="modal-run-full-ai-diagnosis"
                onClick={() => setShowFullDiagnosis(true)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 hover:from-brand-700 hover:to-brand-600 transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-orange-100" />
                <span>Post Analysis</span>
              </button>

              {aiAnalysis ? (
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-ink">
                    <span>AI Analyst Deep Dive</span>
                    <span className="text-xs text-brand-600">{aiAnalysis.answeredBy}</span>
                  </div>
                  <p className="text-body">{aiAnalysis.possibleReason}</p>
                  <div className="space-y-1 pt-1">
                    {aiAnalysis.actionableRecommendations.map((r, i) => (
                      <div key={i} className="text-ink flex items-center gap-1.5">
                        <span className="text-brand-600 font-bold">→</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDeepDive}
                    disabled={isAnalyzing}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-ink hover:bg-ink-soft text-white transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    <Bot className="w-3.5 h-3.5 text-brand-400" />
                    <span>{isAnalyzing ? 'Evaluating Content AI...' : 'Quick AI Insight'}</span>
                  </button>

                  <button
                    onClick={() => setSavedToExperiment(!savedToExperiment)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                      savedToExperiment
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-white border-line-strong text-ink hover:bg-stone-50'
                    }`}
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    <span>{savedToExperiment ? 'Saved' : 'Add to Experiment'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showFullDiagnosis && (
        <PostAIDiagnosisModal
          media={media}
          onClose={() => setShowFullDiagnosis(false)}
        />
      )}
    </div>
  );
};
