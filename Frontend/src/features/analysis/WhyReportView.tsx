import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ComponentProps, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { colors } from '@/constants/colors';
import { elevation } from '@/constants/theme';
import { formatRelativeTime } from '@/lib/format';
import { fetchCreativeReport } from './api';
import type { CreativeRating, CreativeReport } from './creative-report';

type Icon = ComponentProps<typeof Ionicons>['name'];
const ICONS: Icon[] = ['flash', 'locate-outline', 'book-outline', 'image-outline', 'chatbubbles-outline', 'search-outline', 'repeat-outline'];
const ACCENTS = [colors.success, colors.primaryBright, colors.primary, colors.violet, colors.violet, colors.primaryBright, colors.violet];
const RATINGS: Record<CreativeRating, { label: string; backgroundColor: string; color: string }> = {
  very_strong: { label: 'Very strong', backgroundColor: colors.successLight, color: colors.success },
  strong: { label: 'Strong', backgroundColor: colors.successLight, color: colors.success },
  good: { label: 'Good', backgroundColor: colors.sky, color: colors.primary },
  needs_work: { label: 'Needs work', backgroundColor: colors.warningLight, color: colors.warning },
  not_observable: { label: 'Not observable', backgroundColor: colors.neutral100, color: colors.neutral500 },
};

function ReportPoint({ point }: { point: CreativeReport['result']['points'][number] }) {
  const [expanded, setExpanded] = useState(false);
  const accent = ACCENTS[point.number - 1] ?? colors.primary;
  const grade = RATINGS[point.rating];
  return (
    <View style={{ backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.neutral100, marginBottom: 9, ...elevation.card }}>
      <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button" accessibilityLabel={`${point.number}. ${point.title}. ${grade.label}. ${expanded ? 'Hide' : 'Show'} supporting evidence`} accessibilityState={{ expanded }} style={{ padding: 12, minHeight: 86 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ width: 30, height: 32, borderRadius: 8, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.white, fontWeight: '700', fontSize: 12 }}>{String(point.number).padStart(2, '0')}</Text>
          </View>
          <Ionicons name={ICONS[point.number - 1]} size={20} color={accent} style={{ marginTop: 4 }} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <Text accessibilityRole="header" style={{ flexGrow: 1, color: colors.navy, fontSize: 13, lineHeight: 18, fontWeight: '700' }}>{point.title}</Text>
              <Text style={{ fontSize: 10, fontWeight: '600', color: grade.color, backgroundColor: grade.backgroundColor, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden' }}>{grade.label}</Text>
            </View>
            <Text style={{ color: colors.neutral500, fontSize: 12, lineHeight: 18 }}>{point.finding}</Text>
          </View>
        </View>
      </Pressable>
      {expanded ? (
        <View style={{ marginHorizontal: 12, marginBottom: 12, padding: 10, backgroundColor: colors.neutral100, borderRadius: 9, gap: 7 }}>
          <Text style={{ color: colors.navy, fontSize: 11, fontWeight: '700' }}>Evidence from this content</Text>
          {point.evidence.map((e, i) => <Text key={i} style={{ color: colors.neutral500, fontSize: 12, lineHeight: 18 }}><Text style={{ color: colors.navy, fontWeight: '600' }}>{e.timestamp ? `${e.timestamp} · ` : `${e.source.replaceAll('_', ' ')} · `}</Text>{e.description}</Text>)}
        </View>
      ) : null}
    </View>
  );
}

export function WhyReportView({ mediaId, type }: { mediaId: string; type: 'why_top' | 'why_bottom' }) {
  const router = useRouter();
  const [report, setReport] = useState<CreativeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const top = type === 'why_top';
  useEffect(() => {
    let alive = true;
    fetchCreativeReport(mediaId, type).then((data) => {
      if (alive && data.mediaId === mediaId && data.type === type) { setReport(data); setError(null); setLoading(false); }
    }, (e: unknown) => { if (alive) { setError(e instanceof Error ? e.message : 'We could not analyze this content.'); setLoading(false); } });
    return () => { alive = false; };
  }, [mediaId, type, attempt]);

  const reanalyze = useCallback(async () => {
    setRefreshing(true); setError(null);
    try { setReport(await fetchCreativeReport(mediaId, type, true)); }
    catch (e) { setError(e instanceof Error ? e.message : 'We could not update this report.'); }
    finally { setRefreshing(false); }
  }, [mediaId, type]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="chevron-back" size={24} color={colors.navy} /></Pressable>
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: 20, fontWeight: '700', color: colors.navy }}>{top ? 'Why Top?' : 'Why Bottom?'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.successLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 }}><Ionicons name="sparkles" size={12} color={colors.success} /><Text style={{ fontSize: 11, fontWeight: '600', color: colors.success }}>Quick Analysis</Text></View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 36 }}>
        <Text style={{ color: colors.neutral500, fontSize: 12, lineHeight: 18, marginBottom: 14 }}>{top ? 'Explore the creative strengths in this content and what is worth repeating.' : 'Find specific creative improvements to test in this content.'}</Text>
        {loading ? <View style={{ paddingVertical: 50, alignItems: 'center', gap: 12 }}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.navy, fontSize: 14 }}>Reviewing the actual content…</Text><Text style={{ textAlign: 'center', color: colors.neutral500, fontSize: 12, lineHeight: 18 }}>The AI inspects the image or video and its caption.{ '\n' }This report does not use performance metrics.</Text></View> : !report ? (
          <ErrorState title="The content could not be reviewed" message={error ?? 'The actual media is unavailable.'} onRetry={() => { setLoading(true); setError(null); setAttempt((a) => a + 1); }} secondaryAction={error && /reconnect/i.test(error) ? { label: 'Connected accounts', onPress: () => router.push('/connected-accounts') } : undefined} />
        ) : <>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 15, marginBottom: 12, backgroundColor: top ? colors.successLight : colors.warningLight }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: top ? colors.success : colors.warning }}><Ionicons name={top ? 'arrow-up' : 'arrow-down'} size={22} color={colors.white} /></View>
            <View style={{ flex: 1 }}><Text style={{ fontSize: 12, fontWeight: '700', color: colors.navy, marginBottom: 6 }}>Performance Summary</Text><Text style={{ fontSize: 15, fontWeight: '700', color: colors.navy, lineHeight: 21 }}>{report.result.summary}</Text><Text style={{ color: colors.neutral500, fontSize: 11, lineHeight: 17, marginTop: 7 }}>Creative assessment from the actual content. Performance causes cannot be established from creative alone.</Text></View>
          </View>
          {report.refreshError ? <Notice variant="warning" message={report.refreshError} /> : null}
          {error ? <Notice variant="warning" message={error} /> : null}
          {report.result.points.map((p) => <ReportPoint key={p.number} point={p} />)}
          <View style={{ padding: 15, borderRadius: 14, backgroundColor: colors.magentaLight, marginTop: 3, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 }}><Ionicons name="bulb" size={22} color={colors.magenta} /><Text accessibilityRole="header" style={{ fontSize: 14, fontWeight: '700', color: colors.navy }}>Key Recommendations</Text></View>
            {report.result.recommendations.map((r, i) => <View key={i} style={{ flexDirection: 'row', gap: 9, marginBottom: 9 }}><Text style={{ width: 24, height: 24, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.white, color: colors.magenta, textAlign: 'center', lineHeight: 24, fontWeight: '700', fontSize: 12 }}>{i + 1}</Text><Text style={{ flex: 1, color: colors.navy, fontSize: 12, lineHeight: 18 }}>{r}</Text></View>)}
          </View>
          <Text style={{ color: colors.neutral500, fontSize: 11, marginBottom: 7 }}>{`Based on ${report.mediaBasis.replaceAll('_', ' ')} · ${formatRelativeTime(report.analyzedAt)}${report.fromCache ? ' · saved report' : ''}`}</Text>
          {report.result.limitations.map((l, i) => <Text key={i} style={{ color: colors.neutral500, fontSize: 11, lineHeight: 17, marginBottom: 5 }}>{l}</Text>)}
          <View style={{ marginTop: 12 }}><Button title="Analyze again" variant="secondary" icon="refresh-outline" loading={refreshing} onPress={() => void reanalyze()} /></View>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}
