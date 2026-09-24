import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  RotateCw, 
  Check, 
  Clock,
  AlertCircle,
  TrendingUp,
  Target,
  FileCheck2
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { api } from '../services/api';
import { Recommendation } from '../types';
import { EmptyState } from '../components/common/EmptyState';

export const Recommendations: React.FC = () => {
  const { setCurrentTab, connections } = useMedia();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [plannedIds, setPlannedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    api.getRecommendations()
      .then((data) => {
        setRecommendations(data.items || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [connections]);

  const handleAction = async (rec: Recommendation) => {
    try {
      await api.planRecommendation(rec.id);
      setPlannedIds((prev) => ({ ...prev, [rec.id]: true }));
      setTimeout(() => {
        setCurrentTab('planner');
      }, 300);
    } catch (e) {
      console.error('Failed to plan recommendation:', e);
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'CREATE':
        return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
      case 'TEST':
        return 'bg-[#0284C7]/10 text-[#0284C7] border border-[#0284C7]/20';
      case 'REPURPOSE':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      default:
        return 'bg-slate-100 text-[#475569] border border-slate-200';
    }
  };

  const hasConnectedPlatforms = connections.some((c) => c.connected);

  return (
    <div id="recommendations-page" className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-[#0B132B] tracking-tight">
          Recommendations
        </h1>
        <p className="text-xs text-[#64748B] mt-1">
          Measurable, actionable suggestions grounded strictly in your verified platform data.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-24 text-xs text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0]">
          <RotateCw className="w-5 h-5 animate-spin text-[#0284C7] mr-2" />
          Formulating recommendations from real platform data...
        </div>
      ) : recommendations.length === 0 ? (
        <EmptyState
          type={hasConnectedPlatforms ? 'no_data' : 'no_connection'}
          title={hasConnectedPlatforms ? 'Your account is connected, but no analyzable media data is currently available.' : 'Connect your account to generate recommendations.'}
          description="Recommendations require verified published content to detect format efficacy, audience resonance, and timing gaps."
          actionText="Manage Platform Connections"
          onAction={() => setCurrentTab('connections')}
        />
      ) : (
        /* Cards List */
        <div className="space-y-4">
          {recommendations.map((rec) => {
            const isPlanned = plannedIds[rec.id] || rec.status === 'planned';

            return (
              <div
                key={rec.id}
                id={`recommendation-${rec.id}`}
                className="p-5 md:p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-2xs space-y-4 hover:border-[#0284C7]/40 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${getBadgeColor(rec.type)}`}>
                      {rec.type}
                    </span>
                    {rec.suggestedSlot && (
                      <span className="text-[11px] text-[#64748B] flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-[#64748B]" />
                        Suggested Window: {rec.suggestedSlot.day} {rec.suggestedSlot.time} ({rec.suggestedSlot.format})
                      </span>
                    )}
                  </div>

                  {/* Action button */}
                  <div className="shrink-0">
                    <button
                      onClick={() => handleAction(rec)}
                      disabled={isPlanned}
                      className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-2xs ${
                        isPlanned
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                          : 'bg-[#0284C7] hover:bg-[#0369A1] text-white'
                      }`}
                    >
                      {isPlanned ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Added to planner</span>
                        </>
                      ) : (
                        <>
                          <span>{rec.actionText}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <h2 className="text-base font-bold text-[#0B132B] tracking-tight">
                    {rec.title}
                  </h2>
                </div>

                {/* 5-Part Structured Specification Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                  {/* 1. Identified Problem */}
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                    <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-rose-500" />
                      1. Identified Problem
                    </div>
                    <p className="text-xs text-[#0B132B]">
                      {rec.identifiedProblem || rec.reason}
                    </p>
                  </div>

                  {/* 2. Supporting Pattern */}
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                    <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                      2. Supporting Data &amp; Pattern
                    </div>
                    <p className="text-xs text-[#0B132B] font-medium">
                      {rec.supportingPattern || rec.supportingSignal}
                    </p>
                  </div>

                  {/* 3. Recommended Improvement */}
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                    <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      3. Recommended Improvement
                    </div>
                    <p className="text-xs text-[#0B132B] font-medium">
                      {rec.recommendedImprovement || rec.title}
                    </p>
                  </div>

                  {/* 4. Suggested Implementation */}
                  <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                    <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                      <Target className="w-3 h-3 text-[#0284C7]" />
                      4. Suggested Implementation
                    </div>
                    <p className="text-xs text-[#0B132B]">
                      {rec.suggestedImplementation || 'Draft hook and schedule for suggested time window.'}
                    </p>
                  </div>
                </div>

                {/* 5. Expected Measurement Criteria */}
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="text-[11px] text-[#0B132B]">
                      <strong className="text-emerald-800">5. Expected Measurement:</strong> {rec.expectedMeasurement || 'Evaluate 72-hour engagement rate vs account baseline.'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
