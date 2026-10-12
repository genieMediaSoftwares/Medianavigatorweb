'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Video,
  Sparkles,
  Zap,
  VolumeX,
  Copy,
  Check,
  Clock,
  ArrowRight,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import { Modal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { PlatformIcon } from '@/components/ui/platform-logo';
import { platformName, typeLabel } from '@/lib/platforms';
import { api } from '@/lib/api/endpoints';
import { compact, percent, whole } from '@/lib/format';
import type { Performer, VideoAnalysisResult } from '@/types/api';

interface DeepVideoAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Performer | null;
}

export function DeepVideoAnalysisModal({
  open,
  onOpenChange,
  item,
}: DeepVideoAnalysisModalProps) {
  const [copiedHook, setCopiedHook] = useState(false);

  const query = useQuery({
    queryKey: ['deep-video-analysis', item?.mediaId],
    queryFn: () => (item ? api.analyzeVideo(item.mediaId) : null),
    enabled: Boolean(open && item?.mediaId),
    staleTime: 60_000,
  });

  if (!item) return null;

  const res: VideoAnalysisResult | undefined = query.data ?? undefined;
  const hookScore = res?.hookScore ?? (item.isTopPerformer ? 88 : 48);
  const hookQuality = res?.hookQuality ?? (item.isTopPerformer ? 'Exceptional' : 'Needs Improvement');

  const handleCopyHook = (hookText: string) => {
    navigator.clipboard.writeText(hookText);
    setCopiedHook(true);
    setTimeout(() => setCopiedHook(false), 2000);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Deep Video Analysis"
      description={`AI diagnostic of retention, hook pacing, sound-off playback, and viral mechanics for this ${typeLabel(item.contentType)}.`}
      className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scroll"
    >
      <div className="space-y-5">
        {/* Post Quick Preview Header */}
        <div className="flex items-start gap-3.5 rounded-2xl border border-line bg-surface p-4 shadow-2xs">
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              className="h-20 w-20 shrink-0 rounded-xl object-cover border border-line shadow-2xs"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 border border-line text-brand-600">
              <Video className="h-8 w-8" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <PlatformIcon platform={item.platform} className="h-4 w-4" />
                {platformName(item.platform)}
              </span>
              <span className="text-xs text-subtle">·</span>
              <span className="rounded-md bg-brand-50 dark:bg-brand-950/40 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                {typeLabel(item.contentType)}
              </span>
              <span className="ml-auto text-xs font-bold text-muted">
                {item.baselineComparison}
              </span>
            </div>

            <h4 className="mt-1.5 line-clamp-1 text-sm font-bold text-ink">
              {item.title || item.caption || 'Untitled Video'}
            </h4>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
              <span>
                <strong className="text-ink font-semibold">{compact(item.views)}</strong> views
              </span>
              <span>
                <strong className="text-ink font-semibold">{whole(item.likes)}</strong> likes
              </span>
              <span>
                <strong className="text-ink font-semibold">{whole(item.comments)}</strong> comments
              </span>
              <span>
                <strong className="text-ink font-semibold">{percent(item.engagementRate, 2)}</strong> eng.
              </span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {query.isLoading && (
          <div className="space-y-4 py-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-brand-200/80 bg-brand-50/70 p-3.5 dark:border-brand-900/50 dark:bg-brand-950/30">
              <RefreshCw className="h-4 w-4 animate-spin text-brand-600" />
              <div className="text-xs font-medium text-brand-900 dark:text-brand-200">
                <strong>Processing deep video analysis...</strong> Evaluating opening 3-second hook, audio cadence, retention stages, and sound-off readability.
              </div>
            </div>
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        )}

        {/* Error State */}
        {query.isError && (
          <ErrorState
            error={query.error}
            onRetry={() => query.refetch()}
            title="We couldn't complete the video diagnosis"
          />
        )}

        {/* Analysis Content */}
        {!query.isLoading && res && (
          <div className="space-y-4">
            {/* Hook Strength & Quality Gauge Card */}
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-muted">
                      Hook Retention Strength
                    </h5>
                    <p className="text-sm font-bold text-ink">
                      {hookQuality}
                    </p>
                  </div>
                </div>

                <div className="flex items-baseline gap-1 rounded-xl bg-brand-50 dark:bg-brand-950/40 px-3 py-1.5 border border-brand-100 dark:border-brand-900/60">
                  <span className="font-display text-xl font-extrabold text-brand-600 dark:text-brand-300 tabular">
                    {hookScore}
                  </span>
                  <span className="text-xs font-medium text-muted">/100</span>
                </div>
              </div>

              {/* Hook Progress Bar */}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    hookScore >= 75
                      ? 'bg-emerald-500'
                      : hookScore >= 55
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${hookScore}%` }}
                />
              </div>

              <p className="mt-3 text-xs leading-relaxed text-muted">
                {res.hookAssessment || 'The opening frame and title establish the core premise in the first 3 seconds, governing viewer retention.'}
              </p>
            </div>

            {/* 3-Stage Retention Timeline */}
            <div className="rounded-2xl border border-line bg-surface p-4 shadow-2xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted">
                  3-Stage Retention Breakdown
                </h5>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-3">
                {(res.timelineCurve ?? [
                  {
                    secondRange: '0:00 - 0:03',
                    stage: 'Hook Window',
                    retentionEstimate: item.isTopPerformer ? '85% retained' : '52% retained',
                    actionableInsight: 'Deliver the core promise or bold visual payoff immediately.',
                  },
                  {
                    secondRange: '0:03 - 0:15',
                    stage: 'Core Delivery',
                    retentionEstimate: item.isTopPerformer ? '72% retained' : '38% retained',
                    actionableInsight: 'Switch camera angles or b-roll every 3-4 seconds.',
                  },
                  {
                    secondRange: '0:15+',
                    stage: 'CTA & Loop',
                    retentionEstimate: item.isTopPerformer ? '64% retained' : '26% retained',
                    actionableInsight: 'Loop closing sentence back to the opening hook.',
                  },
                ]).map((stage, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col justify-between rounded-xl border border-line bg-app/50 p-3"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-muted">
                        <span>{stage.secondRange}</span>
                        <span className="font-bold text-brand-600 dark:text-brand-300">
                          {stage.retentionEstimate}
                        </span>
                      </div>
                      <h6 className="mt-1 text-xs font-bold text-ink">
                        {stage.stage}
                      </h6>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                        {stage.actionableInsight}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pacing & Sound-Off Optimization */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Audio & Pacing */}
              <div className="rounded-2xl border border-line bg-surface p-4 shadow-2xs">
                <div className="flex items-center gap-2 mb-2">
                  <Sliders className="h-4 w-4 text-brand-600" />
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Pacing & Cadence
                  </h5>
                </div>
                <p className="text-xs leading-relaxed text-ink">
                  {res.audioPacingFeedback ||
                    'Consistent pacing with no dead space maintains viewer engagement through the midpoint.'}
                </p>
              </div>

              {/* Sound-Off Optimization */}
              <div className="rounded-2xl border border-line bg-surface p-4 shadow-2xs">
                <div className="flex items-center gap-2 mb-2">
                  <VolumeX className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Sound-Off Strategy
                  </h5>
                </div>
                <p className="text-xs leading-relaxed text-ink">
                  {res.soundOffOptimizationTip ||
                    'Over 70% watch feeds muted. Use bold 2-to-3 word kinetic captions centered in the vertical safe zone.'}
                </p>
              </div>
            </div>

            {/* Actionable Recommendations Checklist */}
            {res.recommendations && res.recommendations.length > 0 && (
              <div className="rounded-2xl border border-line bg-surface p-4 shadow-2xs">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Video Editing & Script Improvements
                  </h5>
                </div>
                <ul className="space-y-2">
                  {res.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-ink">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed mt-0.5">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Rewritten Tested Alternative Hook */}
            {res.testedAlternativeHook && (
              <div className="rounded-2xl border border-brand-200/90 bg-gradient-to-br from-brand-50/90 to-brand-100/40 p-4 dark:border-brand-900/60 dark:from-brand-950/40 dark:to-slate-900 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-600" />
                    <h5 className="text-xs font-bold uppercase tracking-wider text-brand-800 dark:text-brand-300">
                      Tested Alternative Opening Script
                    </h5>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCopyHook(res.testedAlternativeHook!)}
                    className="h-7 text-xs bg-white dark:bg-slate-800 shadow-2xs"
                  >
                    {copiedHook ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600 mr-1" />
                        Copied Script
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy Script
                      </>
                    )}
                  </Button>
                </div>
                <p className="mt-2 text-sm font-semibold text-brand-950 dark:text-brand-100 leading-snug">
                  &ldquo;{res.testedAlternativeHook}&rdquo;
                </p>
              </div>
            )}

            {/* Viral Replication Concept */}
            {res.viralReplicationConcept && (
              <div className="rounded-2xl border border-line bg-surface p-4 shadow-2xs">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Next Video Repackaging Angle
                  </h5>
                </div>
                <p className="text-xs leading-relaxed text-ink">
                  {res.viralReplicationConcept}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
          <Button
            size="sm"
            variant="primary"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
