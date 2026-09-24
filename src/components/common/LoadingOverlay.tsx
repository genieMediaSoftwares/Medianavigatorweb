import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Compass } from 'lucide-react';

interface LoadingOverlayProps {
  isVisible: boolean;
  currentStep: string;
}

const STAGES = [
  'Collecting signals',
  'Finding patterns',
  'Understanding performance',
  'Preparing insights',
];

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible, currentStep }) => {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs font-sans"
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="w-full max-w-md mx-4 p-8 rounded-3xl bg-white border border-[#E2E8F0] shadow-xl text-center"
        >
          {/* Compass / orbit metaphor */}
          <div className="relative w-14 h-14 mx-auto mb-6 flex items-center justify-center rounded-2xl bg-[#0284C7]/10 border border-[#0284C7]/20 text-[#0284C7]">
            <Compass className="w-7 h-7 animate-spin [animation-duration:8s]" />
            <Sparkles className="w-3.5 h-3.5 text-[#0284C7] absolute -top-1 -right-1 animate-pulse" />
          </div>

          <h3 className="text-xl font-bold text-[#0B132B] tracking-tight mb-2">
            Navigating your media...
          </h3>
          <p className="text-sm text-[#64748B] mb-6">
            Synchronizing data across Instagram, Facebook, YouTube &amp; LinkedIn
          </p>

          {/* Sequential Stages */}
          <div className="space-y-2.5 max-w-xs mx-auto text-left">
            {STAGES.map((stage, idx) => {
              const isCurrent = stage === currentStep;
              const isPassed = STAGES.indexOf(currentStep) > idx;

              return (
                <div
                  key={stage}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isCurrent
                      ? 'bg-[#0284C7]/10 text-[#0284C7] font-semibold border border-[#0284C7]/20'
                      : isPassed
                      ? 'text-emerald-700 opacity-80'
                      : 'text-[#64748B]/50'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full transition-all ${
                      isCurrent
                        ? 'bg-[#0284C7] scale-125 animate-ping'
                        : isPassed
                        ? 'bg-emerald-500'
                        : 'bg-slate-300'
                    }`}
                  />
                  <span>{stage}</span>
                  {isPassed && <span className="ml-auto text-[10px] text-emerald-700">✓</span>}
                  {isCurrent && (
                    <span className="ml-auto text-[10px] text-[#0284C7] animate-pulse font-mono">
                      in progress
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
