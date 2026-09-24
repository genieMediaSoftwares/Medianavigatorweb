import React from 'react';
import { 
  CheckCircle2, 
  RotateCw, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  Database,
  BarChart3,
  Layers,
  Check
} from 'lucide-react';
import { useMedia } from '../../context/MediaContext';

export const SyncProgressModal: React.FC = () => {
  const { syncState, closeSyncFlow, setCurrentTab } = useMedia();

  if (!syncState.isOpen) return null;

  const steps = [
    { num: 1, label: 'Confirming secure OAuth connection', desc: 'Validating PKCE token exchange and permissions' },
    { num: 2, label: 'Fetching profile information', desc: 'Retrieving official channel identifier and follower counts' },
    { num: 3, label: 'Fetching available content archive', desc: 'Recursively traversing all published Reels, Posts, and Videos' },
    { num: 4, label: 'Fetching verified metrics', desc: 'Ingesting reach, impressions, views, likes, and comments' },
    { num: 5, label: 'Processing performance data', desc: 'Calculating channel baselines and format distribution' },
    { num: 6, label: 'Preparing initial growth intelligence', desc: 'Evaluating hook efficacy and timing heatmaps' },
    { num: 7, label: 'Sync completed', desc: 'All media indexed and ready for deep diagnostic evaluation' },
  ];

  const currentStep = syncState.step;
  const progressPercent = Math.min(100, Math.round((currentStep / 7) * 100));

  const handleFinish = () => {
    closeSyncFlow();
    setCurrentTab('overview');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B132B]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full border border-[#CBD5E1] shadow-2xl overflow-hidden space-y-6 p-6 sm:p-7">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#0284C7]/10 text-[#0284C7] flex items-center justify-center mx-auto">
            {syncState.isCompleted ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            ) : (
              <RotateCw className="w-6 h-6 animate-spin text-[#0284C7]" />
            )}
          </div>

          <h3 className="text-lg font-bold text-[#0B132B]">
            {syncState.isCompleted ? 'Synchronization Complete' : 'Synchronizing Account Data'}
          </h3>

          <p className="text-xs text-[#64748B]">
            Ingesting full content archive for{' '}
            <span className="font-semibold text-[#0B132B]">
              @{syncState.accountName || syncState.platform}
            </span>{' '}
            ({syncState.platform?.toUpperCase()})
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#0B132B]">
            <span>Step {currentStep} of 7</span>
            <span className="font-mono text-[#0284C7]">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                syncState.isCompleted ? 'bg-emerald-600' : 'bg-gradient-to-r from-[#0284C7] to-[#06B6D4]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 7-Step Visual List */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {steps.map((s) => {
            const isDone = currentStep > s.num || syncState.isCompleted;
            const isCurrent = currentStep === s.num && !syncState.isCompleted;

            return (
              <div
                key={s.num}
                className={`p-2.5 rounded-xl border transition-colors flex items-start gap-3 ${
                  isCurrent
                    ? 'bg-[#0284C7]/5 border-[#0284C7]/30 text-[#0B132B]'
                    : isDone
                    ? 'bg-white border-[#E2E8F0] text-[#0F172A]'
                    : 'bg-slate-50/50 border-slate-100 text-slate-400'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-[#0284C7] text-white animate-pulse'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isDone ? <Check className="w-3 h-3" /> : s.num}
                </div>

                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{s.label}</div>
                  <div className="text-[10px] text-[#64748B] truncate">{s.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="pt-2 border-t border-[#E2E8F0]">
          {syncState.isCompleted ? (
            <button
              onClick={handleFinish}
              className="w-full py-3 rounded-xl bg-[#0B132B] text-white text-xs font-semibold hover:bg-[#1C2541] transition-all flex items-center justify-center gap-2 shadow-md"
            >
              <span>Explore Dashboard & Performance</span>
              <ArrowRight className="w-4 h-4 text-[#06B6D4]" />
            </button>
          ) : (
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span className="flex items-center gap-1.5 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Live background streaming
              </span>
              <button
                onClick={closeSyncFlow}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Run in background
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
