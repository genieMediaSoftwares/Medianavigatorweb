import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { colors } from '@/constants/colors';
import { elevation } from '@/constants/theme';
import { PLATFORM_META } from '@/features/connections/platforms';
import { formatCompactNumber, formatDate, formatRelativeTime, formatSignedPercent } from '@/lib/format';
import type { AnalysisMetric, AnalysisPoint, ContentAnalysis, ContentAnalysisType, MediaItem } from '@/types/api';

import { ApiError } from '@/lib/api/client';

import { fetchContentAnalysis, fetchMediaItem } from './api';
import { PostThumb } from './components';
import { typeLabel } from './wording';

type IconName = ComponentProps<typeof Ionicons>['name'];

const BASIS: Record<string, { label: string; icon: IconName; full: boolean }> = {
  full_video: { label: 'Full video with audio', icon: 'videocam', full: true },
  youtube_video: { label: 'Full YouTube video', icon: 'logo-youtube', full: true },
  image: { label: 'Full image', icon: 'image', full: true },
  carousel: { label: 'All carousel slides', icon: 'images', full: true },
  thumbnail: { label: 'Thumbnail only (not the full content)', icon: 'image-outline', full: false },
  none: { label: 'No media: caption and numbers only', icon: 'alert-circle-outline', full: false },
};
const EVIDENCE_ICON: Record<AnalysisPoint['evidence'][number]['source'], IconName> = {
  video_frame: 'film-outline',
  audio: 'musical-notes-outline',
  on_screen_text: 'text-outline',
  image: 'image-outline',
  caption: 'chatbox-ellipses-outline',
  metric: 'stats-chart-outline',
  comparison: 'git-compare-outline',
};
const CONFIDENCE_CLASS = { high: 'bg-success-light text-success', medium: 'bg-warning-light text-warning', low: 'bg-neutral-100 text-neutral-500' } as const;
const TITLE: Record<ContentAnalysisType, string> = { deep: 'Deep Analysis', why_top: 'Why it is a top performer', why_bottom: 'Why it needs attention' };

function metricText(m: AnalysisMetric): string {
  if (!m.available || m.value === null) return 'Not available';
  if (m.unit === 'percent') return `${m.value}%`;
  if (m.unit === 'seconds') return m.value >= 90 ? `${Math.round(m.value / 6) / 10} min` : `${m.value}s`;
  return m.value.toLocaleString();
}

function Point({ p, metrics }: { p: AnalysisPoint; metrics: AnalysisMetric[] }) {
  const used = p.metricKeys.map((k) => metrics.find((m) => m.key === k)).filter((m): m is AnalysisMetric => Boolean(m));
  return (
    <View className="mb-md rounded-[16px] border border-neutral-100 bg-white p-md" style={elevation.card}>
      <View className="mb-sm flex-row items-center">
        <Text className="mr-sm h-7 w-7 overflow-hidden rounded-full bg-primary text-center text-[13px] font-bold leading-7 text-white">{p.number}</Text>
        <Text className="flex-1 text-[15px] font-bold text-navy" accessibilityRole="header">
          {p.title}
        </Text>
        <Text className={`overflow-hidden rounded-full px-[7px] py-[1px] text-[10px] font-semibold ${CONFIDENCE_CLASS[p.confidence]}`}>{`${p.confidence} confidence`}</Text>
      </View>

      {p.observations.map((o) => (
        <View key={o} className="mb-[4px] flex-row">
          <Text className="mr-sm text-[13px] text-primary">•</Text>
          <Text className="flex-1 text-[13px] leading-[19px] text-navy">{o}</Text>
        </View>
      ))}

      {p.evidence.length ? (
        <View className="mt-xs">
          {p.evidence.map((e, i) => (
            <View key={`${e.source}${i}`} className="mt-[4px] flex-row items-start rounded-[10px] bg-neutral-50 px-sm py-[6px]">
              <Ionicons name={EVIDENCE_ICON[e.source]} size={13} color={colors.neutral500} style={{ marginTop: 2 }} />
              <Text className="ml-[6px] flex-1 text-[12px] leading-[17px] text-neutral-500">
                {e.timestamp ? <Text className="font-semibold text-navy">{`${e.timestamp}  `}</Text> : null}
                {e.description}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {used.length ? (
        <View className="mt-sm flex-row flex-wrap" style={{ gap: 6 }}>
          {used.map((m) => (
            <Text key={m.key} className="overflow-hidden rounded-full bg-sky px-[8px] py-[2px] text-[11px] text-navy">
              {`${m.label}: `}
              <Text className="font-semibold">{metricText(m)}</Text>
            </Text>
          ))}
        </View>
      ) : null}

      <Text className="mt-sm text-[13px] leading-[19px] text-neutral-500">{p.interpretation}</Text>
    </View>
  );
}

function MetricsPanel({ a }: { a: ContentAnalysis }) {
  const [open, setOpen] = useState(false);
  return (
    <View className="mb-md rounded-[16px] border border-neutral-100 bg-white p-md">
      <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }} className="min-h-9 flex-row items-center">
        <Text className="flex-1 text-[14px] font-bold text-navy">Metrics used</Text>
        <Text className="mr-xs text-[11px] text-neutral-500">{`collected ${formatRelativeTime(a.metrics.collectedAt)}`}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.navy} />
      </Pressable>
      {open ? (
        <>
          {a.metrics.items.map((m) => (
            <View key={m.key} className="flex-row border-b border-neutral-100 py-[6px]">
              <View className="flex-1 pr-sm">
                <Text className="text-[12px] text-navy">{m.label}</Text>
                {m.note ? <Text className="text-[10px] text-neutral-400">{m.note}</Text> : null}
              </View>
              <Text className={`text-[12px] ${m.available ? 'font-semibold text-navy' : 'text-neutral-400'}`}>{metricText(m)}</Text>
            </View>
          ))}
          <Text className="mb-xs mt-md text-[13px] font-bold text-navy">{`Compared with ${a.comparison.basis}`}</Text>
          {a.comparison.rows.map((r) => (
            <View key={r.key} className="flex-row py-[4px]">
              <Text className="flex-1 text-[12px] text-navy">{r.label}</Text>
              <Text className="w-16 text-right text-[12px] text-navy">{r.post === null ? 'N/A' : r.key === 'engagementRate' ? `${r.post}%` : formatCompactNumber(r.post)}</Text>
              <Text className="w-16 text-right text-[12px] text-neutral-500">{r.median === null ? '—' : r.key === 'engagementRate' ? `${r.median}%` : formatCompactNumber(r.median)}</Text>
              <Text className={`w-16 text-right text-[12px] font-semibold ${r.differencePct === null ? 'text-neutral-400' : r.differencePct >= 0 ? 'text-success' : 'text-danger'}`}>{r.differencePct === null ? '—' : formatSignedPercent(r.differencePct)}</Text>
            </View>
          ))}
          <Text className="mt-[2px] text-[10px] text-neutral-400">This post · typical (median) · difference</Text>
          {a.comparison.caveats.map((c) => (
            <Text key={c} className="mt-xs text-[11px] text-neutral-500">{`• ${c}`}</Text>
          ))}
        </>
      ) : null}
    </View>
  );
}

const AUDIO: Record<ContentAnalysis['result']['evidence']['audio'], string | null> = {
  speech: 'Speech heard',
  music: 'Music heard',
  speech_and_music: 'Speech and music heard',
  sound_effects: 'Sound effects heard',
  silent: 'No audio',
  not_applicable: null,
};

/** Plain chips saying what the AI actually analysed. */
function evidenceChips(e: ContentAnalysis['result']['evidence'] | undefined): string[] {
  if (!e) return [];
  const chips: string[] = [];
  if (e.visual === 'full_video' || e.visual === 'youtube_video') chips.push(`Full video watched${e.durationSeconds ? ` · ${Math.round(e.durationSeconds)}s` : ''}`);
  if (e.visual === 'carousel') chips.push(`${e.images + e.videos} slide(s) analyzed${e.videos ? ` · ${e.videos} video` : ''}`);
  if (e.visual === 'image') chips.push('Full image analyzed');
  if (e.momentsCited) chips.push(`${e.momentsCited} moment(s) cited${e.coversTimeline ? ' · start to end' : ''}`);
  const audio = AUDIO[e.audio];
  if (audio) chips.push(audio);
  chips.push(`${e.metricsAvailable} real metric(s)`);
  if (e.caption) chips.push('Caption read');
  return chips;
}

/**
 * Loads (or generates) the saved six-point analysis for one post and renders it. Responses are tied to the
 * post id they were requested for, so a slow answer for a previous post can never appear on this one.
 */
export function ContentAnalysisView({ mediaId, type, rank }: { mediaId: string; type: ContentAnalysisType; rank?: string }) {
  const [item, setItem] = useState<MediaItem | null>(null);
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const current = useRef(mediaId);

  useEffect(() => {
    current.current = mediaId;
    let alive = true;
    fetchMediaItem(mediaId).then((m) => alive && setItem(m), () => undefined);
    fetchContentAnalysis(mediaId, type, { rank }).then(
      (a) => {
        if (!alive || a.mediaId !== mediaId) return;
        setAnalysis(a);
        setError(null);
        setLoading(false);
      },
      (e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'The analysis could not be loaded.');
        setErrorCode(e instanceof ApiError ? e.code : null);
        setLoading(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [mediaId, type, rank, retryKey]);

  const reanalyze = async () => {
    if (reanalyzing) return;
    setReanalyzing(true);
    setReanalyzeError(null);
    const requested = mediaId;
    try {
      const a = await fetchContentAnalysis(requested, type, { reanalyze: true, rank });
      if (current.current === requested) setAnalysis(a);
    } catch (e) {
      if (current.current === requested) setReanalyzeError(e instanceof Error ? e.message : 'Reanalysis failed. Your previous analysis is kept.');
    } finally {
      setReanalyzing(false);
    }
  };

  const header = item ? (
    <View className="mb-md flex-row">
      <PostThumb uri={item.thumbnailUrl} platform={item.platform} type={item.contentType} size={84} />
      <View className="ml-md flex-1">
        <Text className="text-[12px] text-neutral-500">{`${PLATFORM_META[item.platform].name} · ${typeLabel(item.contentType, item.contentTypeBasis)}`}</Text>
        <Text className="mt-[2px] text-[14px] font-semibold leading-[19px] text-navy" numberOfLines={3}>
          {item.title || item.caption || 'Untitled post'}
        </Text>
        <Text className="mt-[2px] text-[11px] text-neutral-400">{`Posted ${formatDate(item.publishedAt)}`}</Text>
      </View>
    </View>
  ) : null;

  if (loading) {
    return (
      <ScrollView className="flex-1 bg-white" contentContainerClassName="px-lg pb-3xl pt-md">
        {header}
        <View className="items-center rounded-[16px] bg-neutral-50 px-lg py-2xl" accessibilityRole="progressbar" accessibilityLabel="Analyzing">
          <ActivityIndicator color={colors.primary} />
          <Text className="mt-md text-center text-[14px] font-semibold text-navy">Analyzing this post…</Text>
          <Text className="mt-xs text-center text-[12px] leading-[17px] text-neutral-500">
            The AI is looking at the actual image or video and the post’s numbers. Videos can take a minute or two. A saved analysis opens instantly.
          </Text>
        </View>
      </ScrollView>
    );
  }
  if (!analysis) {
    return (
      <ScrollView className="flex-1 bg-white" contentContainerClassName="px-lg pb-3xl pt-md">
        {header}
        <ErrorState
          title={errorCode === 'MEDIA_UNAVAILABLE' ? 'The post’s media isn’t available for analysis' : 'We couldn’t analyze this post'}
          message={
            errorCode === 'MEDIA_UNAVAILABLE'
              ? `${error ?? ''} Media Navigator only analyzes the real content, so no analysis was made from the numbers alone.`
              : (error ?? 'Please try again.')
          }
          onRetry={() => { setLoading(true); setError(null); setErrorCode(null); setRetryKey((k) => k + 1); }}
        />
      </ScrollView>
    );
  }

  const basis = BASIS[analysis.mediaBasis] ?? BASIS.none;
  const r = analysis.result;
  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="px-lg pb-3xl pt-md">
      {header}

      <View className="mb-md rounded-[16px] bg-sky p-md">
        <Text className="text-[11px] font-bold uppercase tracking-wider text-primary">{TITLE[type]}</Text>
        <Text className="mt-xs text-[14px] font-semibold leading-[20px] text-navy">{r.summary}</Text>
        <View className="mt-sm flex-row flex-wrap items-center" style={{ gap: 6 }}>
          <View className={`flex-row items-center rounded-full px-[8px] py-[2px] ${basis.full ? 'bg-white' : 'bg-warning-light'}`}>
            <Ionicons name={basis.icon} size={11} color={basis.full ? colors.primary : colors.warning} />
            <Text className={`ml-[3px] text-[11px] font-semibold ${basis.full ? 'text-primary' : 'text-warning'}`}>{basis.label}</Text>
          </View>
          <Text className={`overflow-hidden rounded-full px-[8px] py-[2px] text-[11px] font-semibold ${CONFIDENCE_CLASS[r.confidence.level]}`}>{`Overall ${r.confidence.level} confidence`}</Text>
        </View>
        <Text className="mt-xs text-[11px] text-neutral-500">{r.confidence.reason}</Text>
        <View className="mt-sm flex-row flex-wrap" style={{ gap: 6 }}>
          {evidenceChips(r.evidence).map((c) => (
            <Text key={c} className="overflow-hidden rounded-full bg-white px-[8px] py-[2px] text-[11px] text-navy">
              {c}
            </Text>
          ))}
        </View>
        <Text className="mt-xs text-[11px] text-neutral-500">
          {`Analyzed ${formatRelativeTime(analysis.analyzedAt)}${analysis.fromCache ? ' · saved result' : ''}${analysis.model ? ` · ${analysis.model}` : ''}`}
        </Text>
      </View>

      {analysis.stale && !analysis.refreshError ? <Notice variant="info" message="This post’s numbers have changed since this analysis was made. Tap Reanalyze to update it." /> : null}
      {analysis.refreshError ? <Notice variant="warning" title="Showing your previous analysis" message={analysis.refreshError} /> : null}
      {reanalyzeError ? <Notice variant="warning" title="Reanalysis failed" message={`${reanalyzeError} Your previous analysis is kept.`} /> : null}

      {r.points.map((p) => (
        <Point key={p.number} p={p} metrics={analysis.metrics.items} />
      ))}

      {r.recommendations.length ? (
        <View className="mb-md rounded-[16px] border border-neutral-100 bg-white p-md">
          <Text className="mb-xs text-[14px] font-bold text-navy">Recommendations</Text>
          {r.recommendations.map((x) => (
            <Text key={x} className="mb-[4px] text-[13px] leading-[19px] text-navy">{`• ${x}`}</Text>
          ))}
        </View>
      ) : null}

      {r.limitations.length ? (
        <View className="mb-md rounded-[16px] bg-neutral-50 p-md">
          <Text className="mb-xs text-[14px] font-bold text-navy">What this analysis could not see</Text>
          {r.limitations.map((x) => (
            <Text key={x} className="mb-[4px] text-[12px] leading-[17px] text-neutral-500">{`• ${x}`}</Text>
          ))}
        </View>
      ) : null}

      <MetricsPanel a={analysis} />

      <Button title={reanalyzing ? 'Reanalyzing…' : 'Reanalyze'} icon="refresh-outline" variant="secondary" onPress={() => void reanalyze()} loading={reanalyzing} disabled={reanalyzing} />
    </ScrollView>
  );
}
