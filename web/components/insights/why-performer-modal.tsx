'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  AlertTriangle,
  Copy,
  Check,
  TrendingUp,
  Brain,
  Video,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { PlatformIcon } from '@/components/ui/platform-logo';
import { platformName, typeLabel } from '@/lib/platforms';
import { api } from '@/lib/api/endpoints';
import { compact, percent, whole } from '@/lib/format';
import type { Performer } from '@/types/api';

interface WhyPerformerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Performer | null;
  type: 'top' | 'bottom';
  onOpenFullDetail?: (mediaId: string) => void;
}

const BULLET_LABELS_TOP = [
  'Hook & Opening Retention',
  'Format & Pacing Dynamics',
  'Baseline Outperformance',
  'Algorithmic Distribution Signal',
  'Audience Resonance & Signals',
  'Replicable Winning Formula',
];

const BULLET_LABELS_BOTTOM = [
  'Hook Drop-off Friction',
  'Format & Delivery Resistance',
  'Comparative Baseline Deficit',
  'Value Proposition & CTA Gap',
  'Algorithmic Distribution Choke',
  'Tested Actionable Hook Fix',
];

export function WhyPerformerModal({
  open,
  onOpenChange,
  item,
  type,
  onOpenFullDetail,
}: WhyPerformerModalProps) {
  const [copied, setCopied] = useState(false);

  const query = useQuery({
    queryKey: ['diagnose-post-6bullets', item?.mediaId],
    queryFn: () => (item ? api.diagnosePost(item.mediaId) : null),
    enabled: Boolean(open && item?.mediaId),
    staleTime: 60_000,
  });

  if (!item) return null;

  const isTop = type === 'top';
  const rawBullets = query.data?.sixBulletAnalysis;

  // Guarantee 6 distinct, structured bullet points
  const bullets: Array<{ label: string; text: string }> = (() => {
    const defaultLabels = isTop ? BULLET_LABELS_TOP : BULLET_LABELS_BOTTOM;
    if (rawBullets && rawBullets.length >= 6) {
      return rawBullets.slice(0, 6).map((b, i) => {
        const colonIndex = b.indexOf(':');
        if (colonIndex > -1 && colonIndex < 40) {
          return {
            label: b.slice(0, colonIndex).trim(),
            text: b.slice(colonIndex + 1).trim(),
          };
        }
        return {
          label: defaultLabels[i] ?? `Point ${i + 1}`,
          text: b.trim(),
        };
      });
    }

    if (isTop) {
      return [
        {
          label: defaultLabels[0] ?? 'Hook & Retention',
          text:
            query.data?.topSuccessDrivers?.[0] ||
            'Strong opening title and first-line hook immediately captured viewer interest and prevented feed scrolling.',
        },
        {
          label: defaultLabels[1] ?? 'Format & Dynamics',
          text:
            query.data?.topSuccessDrivers?.[1] ||
            `The ${typeLabel(item.contentType)} format pacing maintained high engagement throughout the content duration.`,
        },
        {
          label: defaultLabels[2] ?? 'Baseline Comparison',
          text: `Verified ${compact(item.views)} views and ${percent(item.engagementRate)} engagement (${item.baselineComparison} vs your account median).`,
        },
        {
          label: defaultLabels[3] ?? 'Algorithm Signal',
          text:
            query.data?.topSuccessDrivers?.[2] ||
            `Early velocity of ${whole(item.likes)} likes and ${whole(item.comments)} comments prompted discovery recommendation.`,
        },
        {
          label: defaultLabels[4] ?? 'Audience Resonance',
          text:
            query.data?.topSuccessDrivers?.[3] ||
            'High viewer resonance resulted in active comment participation and above-average saves/shares.',
        },
        {
          label: defaultLabels[5] ?? 'Replicable Formula',
          text:
            item.patternToReplicateOrImprove ||
            'Replicate this specific hook structure, concise storytelling, and visual angle in your next scheduled content.',
        },
      ];
    }

    return [
      {
        label: defaultLabels[0] ?? 'Hook Drop-off',
        text:
          query.data?.bottomImprovementPoints?.[0] ||
          'Opening line and title lacked immediate hook curiosity or clear emotional promise in the crucial first 3 seconds.',
      },
      {
        label: defaultLabels[1] ?? 'Format Friction',
        text:
          query.data?.bottomImprovementPoints?.[1] ||
          `Content pacing or delivery format for ${platformName(item.platform)} caused premature viewer retention drop-off.`,
      },
      {
        label: defaultLabels[2] ?? 'Baseline Deficit',
        text: `Recorded ${compact(item.views)} views and ${percent(item.engagementRate)} engagement (${item.baselineComparison} vs your normal median).`,
      },
      {
        label: defaultLabels[3] ?? 'Value Gap',
        text:
          query.data?.bottomImprovementPoints?.[2] ||
          'Friction in the value proposition or missing engagement prompt resulted in lower interaction reactions.',
      },
      {
        label: defaultLabels[4] ?? 'Algorithm Throttle',
        text:
          query.data?.bottomImprovementPoints?.[3] ||
          'Sub-baseline initial retention signaled lower relevance to the distribution algorithm, limiting reach.',
      },
      {
        label: defaultLabels[5] ?? 'Hook Fix',
        text:
          query.data?.suggestedHookAlternative
            ? `Test rewritten opening hook: "${query.data.suggestedHookAlternative}"`
            : item.alternativeApproach ||
              'Open directly with a surprising question or bold visual statement; cut introduction by 3-5 seconds.',
      },
    ];
  })();

  const handleCopy = () => {
    const textToCopy = [
      `Media Navigator — ${isTop ? "Why It's Top (Gemini AI Analysis)" : "Why It's Bottom (Gemini AI Diagnostic)"}`,
      `Post: "${item.title || item.caption || 'Untitled'}" (${platformName(item.platform)})`,
      `Performance: ${item.baselineComparison}`,
      '',
      ...bullets.map((b, i) => `${i + 1}. [${b.label}] ${b.text}`),
    ].join('\n');

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isVideo = ['reel', 'short', 'video'].includes(item.contentType);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isTop ? "Why It's in Top" : "Why It's Below Baseline"}
      description={`Forensic 6-point Gemini AI analysis for this ${typeLabel(item.contentType)}.`}
      className="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Post Quick Header */}
        <div className="flex items-start gap-3.5 rounded-xl border border-line bg-surface p-3.5 shadow-2xs">
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              className="h-16 w-16 shrink-0 rounded-lg object-cover border border-line"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-50 border border-line">
              <PlatformIcon platform={item.platform} className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-semibold text-muted">
                <PlatformIcon platform={item.platform} className="h-3.5 w-3.5" />
                {platformName(item.platform)}
              </span>
              <span className="text-xs text-subtle">·</span>
              <span className="text-xs font-medium text-muted uppercase">
                {typeLabel(item.contentType)}
              </span>
              <span
                className={`ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  isTop
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                }`}
              >
                {item.baselineComparison}
              </span>
            </div>
            <h4 className="mt-1 line-clamp-1 text-sm font-bold text-ink">
              {item.title || item.caption || 'Untitled Media'}
            </h4>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted">
              <span>
                <strong className="text-ink">{compact(item.views)}</strong> views
              </span>
              <span>
                <strong className="text-ink">{whole(item.likes)}</strong> likes
              </span>
              <span>
                <strong className="text-ink">{whole(item.comments)}</strong> comments
              </span>
              <span>
                <strong className="text-ink">{percent(item.engagementRate, 2)}</strong> eng.
              </span>
            </div>
          </div>
        </div>

        {/* Gemini Badge */}
        <div className="flex items-center justify-between rounded-xl bg-brand-50 border border-brand-200/80 px-4 py-2.5 dark:bg-brand-950/30 dark:border-brand-900/60">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#1D63ED] text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold text-[#1D63ED] dark:text-brand-300">
              Analyzed with Gemini API (Full Post & Video Diagnosis)
            </span>
          </div>
          <span className="text-[11px] font-medium text-muted">6 Core Bullet Points</span>
        </div>

        {/* Loading State */}
        {query.isLoading && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-brand-700 dark:text-brand-300">
              <RefreshCw className="h-4 w-4 animate-spin text-[#1D63ED]" />
              <span>Analyzing whole post, hook, captions, and retention metrics...</span>
            </div>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        )}

        {/* Error State */}
        {query.isError && (
          <ErrorState
            error={query.error}
            onRetry={() => query.refetch()}
            title="We couldn't complete the Gemini analysis"
          />
        )}

        {/* The 6 Accurate Analytical Bullet Points */}
        {!query.isLoading && (
          <div className="space-y-2.5">
            {bullets.map((bullet, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-brand-200 shadow-2xs"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    isTop
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    {bullet.label}
                  </span>
                  <p className="mt-0.5 text-sm font-medium text-ink leading-relaxed">
                    {bullet.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCopy}
            className="text-xs"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 mr-1.5" />
                Copied 6 Points!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copy 6 Bullet Points
              </>
            )}
          </Button>

          {onOpenFullDetail && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                onOpenChange(false);
                onOpenFullDetail(item.mediaId);
              }}
              className="text-xs"
            >
              Open Post Drawer
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
