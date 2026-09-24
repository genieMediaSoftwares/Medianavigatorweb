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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B132B]/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        id="content-detail-modal"
        className="w-full max-w-4xl bg-white border border-[#CBD5E1] rounded-2xl shadow-2xl overflow-hidden my-6"
      >
        {/* Top Bar Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5 text-xs text-[#64748B]">
            <span className="font-bold uppercase tracking-wider text-[#0284C7]">
              {media.platform} {media.contentType}
            </span>
            <span aria-hidden="true">·</span>
            <span>Published {media.publishedAt}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0B132B] hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 md:p-8">
          {/* Left Column: Media Preview & Caption */}
          <div className="md:col-span-5 space-y-4">
            <div className="relative aspect-[4/5] rounded-xl overflow-hidden border border-[#E2E8F0] bg-slate-100 group">
              <img
                src={media.thumbnailUrl}
                alt={media.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B132B]/80 via-transparent to-transparent opacity-90" />

              <div className="absolute bottom-3 left-3 right-3 text-white text-xs">
                <span className="px-2 py-0.5 rounded-md bg-[#0284C7] text-white font-bold text-[10px] uppercase tracking-wider mb-1.5 inline-block">
                  {media.contentType}
                </span>
                <p className="font-semibold line-clamp-2">{media.title}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1 text-xs">
              <span className="font-bold text-[#0B132B] uppercase tracking-wider text-[10px]">
                Caption & Script
              </span>
              <p className="text-[#64748B] leading-relaxed italic">
                "{media.caption || media.title}"
              </p>
            </div>
          </div>

          {/* Right Column: Verified Metrics & Grounded AI Analysis */}
          <div className="md:col-span-7 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Historical Benchmark Comparison
                </span>
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  ● {media.primarySignal.value}
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#0B132B] tracking-tight">
                {media.title}
              </h2>
            </div>

            {/* 6 Key Verified Metrics */}
            <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div>
                <div className="text-[10px] uppercase font-semibold text-[#64748B]">Total Views</div>
                <div className="text-base font-extrabold text-[#0B132B] font-mono">
                  {media.views.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-[#64748B]">Unique Reach</div>
                <div className="text-base font-extrabold text-[#0B132B] font-mono">
                  {media.reach.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-[#64748B]">Engagement</div>
                <div className="text-base font-extrabold text-[#0284C7] font-mono">
                  {media.engagementRate}%
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-[#64748B]">Viral Shares</div>
                <div className="text-base font-extrabold text-[#0B132B] font-mono">
                  {media.shares.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-[#64748B]">Likes</div>
                <div className="text-base font-extrabold text-[#0B132B] font-mono">
                  {media.likes.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-[#64748B]">Comments</div>
                <div className="text-base font-extrabold text-[#0B132B] font-mono">
                  {media.comments.toLocaleString()}
                </div>
              </div>
            </div>

            {/* AI Pattern Breakdown */}
            <div className="p-4 rounded-xl bg-[#0284C7]/5 border border-[#0284C7]/20 space-y-2">
              <div className="text-xs font-bold text-[#0284C7] flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-[#0284C7]" />
                Algorithmic Signal Explanation
              </div>
              <p className="text-xs text-[#0F172A] leading-relaxed">
                <strong className="text-[#0284C7]">Measured Observation: </strong>
                {media.explanation.observedFact}
              </p>
              <p className="text-xs text-[#475569] leading-relaxed">
                <strong className="text-[#64748B]">Grounded Hypothesis: </strong>
                {media.explanation.possibleReason}
              </p>
            </div>

            {/* Repeatable Success Elements */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-[#0B132B] uppercase tracking-wider">
                Formula Elements to Repeat
              </div>
              <div className="space-y-1">
                {media.explanation.whatToRepeat.map((point, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-[#475569]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Deep Dive Result or Action */}
            <div className="pt-2 space-y-2.5">
              <button
                id="modal-run-full-ai-diagnosis"
                onClick={() => setShowFullDiagnosis(true)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#0284C7] via-[#0ea5e9] to-[#06B6D4] hover:from-[#0369a1] hover:to-[#0891b2] transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-sky-100" />
                <span>Forensic AI Breakdown (Why it worked / didn't work)</span>
              </button>

              {aiAnalysis ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-[#0B132B]">
                    <span>AI Analyst Deep Dive</span>
                    <span className="text-[10px] text-[#0284C7]">{aiAnalysis.answeredBy}</span>
                  </div>
                  <p className="text-[#475569]">{aiAnalysis.possibleReason}</p>
                  <div className="space-y-1 pt-1">
                    {aiAnalysis.actionableRecommendations.map((r, i) => (
                      <div key={i} className="text-[#0B132B] flex items-center gap-1.5">
                        <span className="text-[#0284C7] font-bold">→</span>
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
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-[#0B132B] hover:bg-[#1C2541] text-white transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    <Bot className="w-3.5 h-3.5 text-[#06B6D4]" />
                    <span>{isAnalyzing ? 'Evaluating via Gemini AI...' : 'Quick AI Insight'}</span>
                  </button>

                  <button
                    onClick={() => setSavedToExperiment(!savedToExperiment)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                      savedToExperiment
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-white border-[#CBD5E1] text-[#0F172A] hover:bg-slate-50'
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
