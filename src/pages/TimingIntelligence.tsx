import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  RotateCw, 
  Sparkles, 
  ArrowRight,
  Info
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { api, TimingData } from '../services/api';
import { TimingSlot } from '../types';
import { EmptyState } from '../components/common/EmptyState';

export const TimingIntelligence: React.FC = () => {
  const { setCurrentTab, connections } = useMedia();
  const [data, setData] = useState<TimingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<{ day: string; timeOfDay: string; score: number; sampleCount?: number } | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getTiming()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [connections]);

  const days: TimingSlot['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const timeSlots: TimingSlot['timeOfDay'][] = [
    'Morning', 'Afternoon', 'Evening', 'Night'
  ];

  const getCellIntensity = (score: number) => {
    if (score >= 90) return 'bg-[#0284C7] text-white shadow-xs font-bold';
    if (score >= 75) return 'bg-[#0284C7]/40 text-[#0B132B] font-semibold';
    if (score >= 60) return 'bg-[#0284C7]/20 text-[#0B132B] font-medium';
    if (score >= 30) return 'bg-slate-100 text-[#64748B]';
    return 'bg-[#F8FAFC] text-[#64748B]/50 border border-[#E2E8F0]';
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-24 text-xs text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0]">
        <RotateCw className="w-5 h-5 animate-spin text-[#0284C7] mr-2" />
        Analyzing publication timestamps and response curves...
      </div>
    );
  }

  const hasData = data?.hasData && data.strongestWindow && data.matrix.length > 0;

  return (
    <div id="timing-intelligence-page" className="space-y-6 max-w-5xl mx-auto font-sans">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-[#0B132B] tracking-tight">
          When Should You Publish?
        </h1>
        <p className="text-xs text-[#64748B] mt-1">
          Derived strictly from your actual historical performance timestamps.
        </p>
      </div>

      {!hasData ? (
        <EmptyState
          type="no_data"
          title="Not enough historical data is available to generate a reliable posting-time recommendation."
          description="Media Navigator analyzes verified timestamps and engagement curves from your connected platforms. Continue publishing and syncing data to improve this analysis."
          actionText="Manage Platform Connections"
          onAction={() => setCurrentTab('connections')}
        />
      ) : (
        <>
          {/* Notice */}
          <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-[#0B132B] flex items-center gap-2">
            <Info className="w-4 h-4 text-[#0284C7] shrink-0" />
            <span>
              <strong>Data-Informed Notice:</strong> Posting-time recommendations are data-informed suggestions derived from your historical performance, not guaranteed algorithmic results.
            </span>
          </div>

          {/* Heatmap Card */}
          <section className="p-6 md:p-8 rounded-3xl bg-white border border-[#E2E8F0] shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0284C7]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  Engagement Density Heatmap
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
                <span>Low</span>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-xs bg-[#F8FAFC] border border-[#E2E8F0]" />
                  <span className="w-3 h-3 rounded-xs bg-slate-200" />
                  <span className="w-3 h-3 rounded-xs bg-[#0284C7]/30" />
                  <span className="w-3 h-3 rounded-xs bg-[#0284C7]" />
                </div>
                <span>Peak</span>
              </div>
            </div>

            {/* Heatmap Grid */}
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                {/* Day Header Row */}
                <div className="grid grid-cols-8 gap-2 mb-2 text-center text-xs font-semibold text-[#64748B]">
                  <div className="text-left font-normal text-[11px] text-[#64748B]/70">Window</div>
                  {days.map((day) => (
                    <div 
                      key={day} 
                      className={data?.strongestWindow?.label.includes(day) ? 'text-[#0284C7] font-bold' : ''}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Time Slot Rows */}
                {timeSlots.map((slot) => {
                  return (
                    <div key={slot} className="grid grid-cols-8 gap-2 mb-2 items-center">
                      <div className="text-[11px] font-medium text-[#64748B]">
                        {slot}
                      </div>

                      {days.map((day) => {
                        const match = data?.matrix.find(
                          (m: TimingSlot) => m.day === day && m.timeOfDay === slot
                        );
                        const score = match ? match.score : 0;
                        const sampleCount = match?.sampleCount || 0;
                        const isPeak = Boolean(
                          data.strongestWindow &&
                          data.strongestWindow.label.includes(day) &&
                          data.strongestWindow.label.includes(slot)
                        );

                        return (
                          <div
                            key={`${day}-${slot}`}
                            onMouseEnter={() => setHoveredCell({ day, timeOfDay: slot, score, sampleCount })}
                            onMouseLeave={() => setHoveredCell(null)}
                            className={`h-11 rounded-xl flex items-center justify-center text-xs transition-all cursor-pointer relative ${getCellIntensity(
                              score
                            )} ${isPeak ? 'ring-2 ring-[#0284C7] ring-offset-1' : ''}`}
                          >
                            <span className="text-[11px]">{score > 0 ? score : '—'}</span>
                            {isPeak && (
                              <span className="absolute -top-1.5 -right-1 w-2.5 h-2.5 rounded-full bg-[#0284C7] animate-ping" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {hoveredCell && (
              <div className="text-center text-xs text-[#64748B] pt-2">
                <span className="font-semibold text-[#0B132B]">{hoveredCell.day} {hoveredCell.timeOfDay}</span>: Index rating {hoveredCell.score}/100 {hoveredCell.sampleCount !== undefined ? `(${hoveredCell.sampleCount} analyzed assets in this window)` : ''}.
              </div>
            )}
          </section>

          {/* Strongest Publishing Window Banner */}
          {data?.strongestWindow && (
            <section className="p-6 md:p-8 rounded-3xl bg-white border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Confidence: {data.strongestWindow.confidence}
                </div>
                <div className="text-xs uppercase tracking-wider font-semibold text-[#64748B]">
                  Your strongest publishing window
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-[#0B132B] tracking-tight">
                  {data.strongestWindow.label} ({data.strongestWindow.timeSlot})
                </h2>
                <p className="text-xs text-[#64748B] max-w-lg">
                  {data.strongestWindow.supportingText}
                </p>
              </div>

              <button
                id="plan-content-button"
                onClick={() => setCurrentTab('planner')}
                className="py-3 px-5 rounded-xl text-xs font-semibold bg-[#0284C7] hover:bg-[#0369A1] text-white transition-colors flex items-center justify-center gap-2 shadow-2xs shrink-0"
              >
                <span>Plan content</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </section>
          )}
        </>
      )}
    </div>
  );
};
