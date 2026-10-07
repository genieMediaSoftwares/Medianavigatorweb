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
import { useMedia } from '../../app/providers/MediaContext';

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
    setCurrentTab('content');
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full border border-line-strong shadow-2xl overflow-hidden space-y-6 p-6 sm:p-7">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-600/10 text-brand-600 flex items-center justify-center mx-auto">
            {syncState.isCompleted ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            ) : (
              <RotateCw className="w-6 h-6 animate-spin text-brand-600" />
            )}
          </div>

          <h3 className="text-lg font-bold text-ink">
            {syncState.isCompleted ? 'Synchronization Complete' : 'Synchronizing Account Data'}
          </h3>

          <p className="text-xs text-muted">
            Ingesting full content archive for{' '}
            <span className="font-semibold text-ink">
              @{syncState.accountName || syncState.platform}
            </span>{' '}
            ({syncState.platform?.toUpperCase()})
          </p>
        </div>

        {/* Real Count Callout when completed */}
        {syncState.isCompleted && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
            <div className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Successfully Synchronized {syncState.syncedCount || 0} Verified Posts</span>
            </div>
            <p className="text-xs text-emerald-700">
              All published media assets indexed with verified views, engagement, and retention signals.
            </p>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-ink">
            <span>Step {currentStep} of 7</span>
            <span className="font-mono text-brand-600">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                syncState.isCompleted ? 'bg-emerald-600' : 'bg-gradient-to-r from-brand-600 to-brand-400'
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
                    ? 'bg-brand-600/5 border-brand-600/30 text-ink'
                    : isDone
                    ? 'bg-white border-line text-ink'
                    : 'bg-stone-50/50 border-stone-100 text-stone-400'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-brand-600 text-white animate-pulse'
                      : 'bg-stone-200 text-stone-500'
                  }`}
                >
                  {isDone ? <Check className="w-3 h-3" /> : s.num}
                </div>

                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{s.label}</div>
                  <div className="text-xs text-muted truncate">{s.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="pt-2 border-t border-line">
          {syncState.isCompleted ? (
            <button
              onClick={handleFinish}
              className="w-full py-3 rounded-xl bg-ink text-white text-xs font-semibold hover:bg-ink-soft transition-all flex items-center justify-center gap-2 shadow-md"
            >
              <span>
                Explore {syncState.syncedCount && syncState.syncedCount > 0 ? `${syncState.syncedCount} Verified Posts` : 'Dashboard & Performance'}
              </span>
              <ArrowRight className="w-4 h-4 text-brand-400" />
            </button>
          ) : (
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Live background streaming
              </span>
              <button
                onClick={closeSyncFlow}
                className="text-xs text-stone-400 hover:text-stone-600"
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
