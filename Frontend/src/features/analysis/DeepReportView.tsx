import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { formatDate } from '@/lib/format';
import type { MediaItem } from '@/types/api';
import { deepUiReducer, initialDeepUi } from '../../../../shared/deepAnalysisUi';
import { deepReportText } from '../../../../shared/deepAnalysisExport';
import type { DeepAnalysisState, DeepAnalysisV2 } from '../../../../shared/deepAnalysisV2';
import { cancelDeepAnalysisV2, fetchMediaItem, pollDeepAnalysisV2, refreshDeepAudience, savedDeepActions, saveDeepAction, startDeepAnalysisV2 } from './api';
import { exportDeepReport } from './deepV2.export';
import { PriorityFindingCard, ReportTabs, statusStyle, timeLabel } from './DeepReportParts';
import { AudiencePanel } from './AudiencePanel';

const PLATFORM_ICON = { instagram: 'logo-instagram', facebook: 'logo-facebook', youtube: 'logo-youtube', linkedin: 'logo-linkedin' } as const;
const ACTION_TITLE = { repeat: 'Repeat What Worked', change: 'Avoid or Change Next Time', idea: 'Your Next Content Idea' } as const;

function IntelligenceTimeline({ report }: { report: DeepAnalysisV2 }) {
  const scenes = report.overview.timeline;
  const videos = report.mediaType === 'carousel' ? [] : scenes.filter((scene) => scene.startSeconds !== null && scene.endSeconds !== null);
  const slides = scenes.filter((scene, index) => scene.slideNumber !== null && !scenes.slice(0, index).some((previous) => previous.slideNumber === scene.slideNumber));
  if (!videos.length && !slides.length) return <View style={s.card}><Text style={s.cardTitle}>{report.mediaType === 'text' ? 'Written content assessment' : report.mediaType === 'document' ? 'Document assessment' : ['video', 'reel', 'short'].includes(report.mediaType) ? 'Video access limited' : 'Image assessment'}</Text><Text style={s.body}>{report.coverage.isComplete ? 'The accessible content was assessed. Findings below cite the details used.' : 'Available content was assessed. See the coverage limits below.'}</Text></View>;
  const segments = videos.length ? videos : slides;
  return <View style={s.card}>
    <View style={s.row}><Ionicons name="pulse-outline" size={20} color={colors.primary} /><Text accessibilityRole="header" style={s.cardTitle}>{videos.length ? 'Content Intelligence' : 'Slide Progression'}</Text></View>
    <View accessibilityLabel="Creative assessment timeline, not audience retention" style={s.timeline}>{segments.map((segment, index) => <View key={index} accessible accessibilityLabel={`${segment.slideNumber ? `Slide ${segment.slideNumber}` : `${timeLabel(segment.startSeconds!)} to ${timeLabel(segment.endSeconds!)}`}. ${statusStyle[segment.status].label}`} style={{ flex: videos.length ? Math.max(.01, segment.endSeconds! - segment.startSeconds!) : 1, height: 19, backgroundColor: statusStyle[segment.status].timeline }} />)}</View>
    <View style={[s.row, { justifyContent: 'space-between' }]}><Text style={s.small}>{videos.length ? timeLabel(Math.min(...videos.map((v) => v.startSeconds!))) : `Slide ${segments[0].slideNumber}`}</Text><Text style={s.small}>{videos.length ? timeLabel(Math.max(...videos.map((v) => v.endSeconds!))) : `Slide ${segments.at(-1)?.slideNumber}`}</Text></View>
    <View style={[s.row, { flexWrap: 'wrap', marginTop: 9 }]}>{Object.entries(statusStyle).map(([key, grade]) => <View key={key} style={[s.row, { gap: 4 }]}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: grade.timeline }} /><Text style={s.small}>{key === 'insufficient_evidence' ? 'Not analyzed / insufficient evidence' : grade.label}</Text></View>)}</View>
    <Text style={[s.small, { marginTop: 8 }]}>Creative segment assessment, not measured audience retention.</Text>
  </View>;
}

export function DeepReportView({ mediaId }: { mediaId: string }) {
  const router = useRouter();
  const [ui, dispatch] = useReducer(deepUiReducer, mediaId, initialDeepUi);
  const [item, setItem] = useState<MediaItem | null>(null);
  const [retry, setRetry] = useState(0);
  const [goal, setGoal] = useState('');
  const [requestedGoal, setRequestedGoal] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [audienceRefreshing, setAudienceRefreshing] = useState(false);
  const generation = useRef(0);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    let alive = true;
    fetchMediaItem(mediaId).then((post) => { if (alive && post.id === mediaId) setItem(post); }, () => undefined);
    return () => { alive = false; };
  }, [mediaId]);
  useEffect(() => {
    const current = ++generation.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    const failed = (error: unknown) => { if (alive && current === generation.current) dispatch({ type: 'failed', postId: mediaId, message: error instanceof Error ? error.message : 'The analysis could not be loaded.' }); };
    const receive = async (job: DeepAnalysisState) => {
      if (!alive || current !== generation.current || job.postId !== mediaId || (job.report && job.report.postId !== mediaId)) return;
      dispatch({ type: 'received', job });
      if (['queued', 'processing'].includes(job.status)) timer = setTimeout(() => { pollDeepAnalysisV2(job.jobId).then(receive, failed); }, 2000);
      else savedDeepActions(job.jobId).then((ids) => { if (alive && current === generation.current) setSaved(ids); }, () => undefined);
    };
    startDeepAnalysisV2(mediaId, retry > 0, requestedGoal).then(receive, failed);
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [mediaId, retry, requestedGoal]);
  const report = ui.job?.report ?? null;
  const platform = report?.platform ?? item?.platform;
  const identifier = report?.post.title || report?.post.caption || item?.title || item?.caption || 'Loading selected post…';
  const date = report?.post.publishedAt ?? item?.publishedAt;
  const restart = (newGoal?: string) => { setNotice(null); dispatch({ type: 'begin' }); if (newGoal !== undefined) setRequestedGoal(newGoal || undefined); setRetry((r) => r + 1); };
  const copy = async (text: string) => {
    try { setNotice(await Clipboard.setStringAsync(text) ? 'Copied to clipboard.' : 'Copy is unavailable in this browser. Use Export instead.'); }
    catch { setNotice('Copy is unavailable. Use Export instead.'); }
  };
  const save = async (actionId: string) => {
    if (!ui.job || saving) return;
    setSaving(actionId);
    const wasSaved = saved.includes(actionId);
    try { await saveDeepAction(ui.job.jobId, actionId, !wasSaved); setSaved((ids) => wasSaved ? ids.filter((id) => id !== actionId) : [...ids, actionId]); setNotice(wasSaved ? 'Recommendation removed from saved ideas.' : 'Recommendation saved to this report.'); }
    catch { setNotice('The recommendation could not be saved. Please retry.'); }
    finally { setSaving(null); }
  };
  const cancel = async () => {
    if (!ui.job) return;
    try { const job = await cancelDeepAnalysisV2(ui.job.jobId); generation.current++; dispatch({ type: 'received', job }); }
    catch { setNotice('Cancellation could not be confirmed. Please retry.'); }
  };
  const refreshAudience = async () => {
    if (!ui.job || audienceRefreshing) return;
    const current = generation.current;
    setAudienceRefreshing(true); setNotice(null);
    try {
      const job = await refreshDeepAudience(ui.job.jobId);
      if (current === generation.current && job.postId === mediaId) { dispatch({ type: 'received', job }); setNotice('Audience feedback refreshed.'); }
    } catch (error) { if (current === generation.current) setNotice(error instanceof Error ? error.message : 'Audience feedback could not be refreshed. Please retry.'); }
    finally { setAudienceRefreshing(false); }
  };
  return <SafeAreaView edges={['top', 'left', 'right']} style={s.screen}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={s.iconButton}><Ionicons name="arrow-back" size={24} color={colors.navy} /></Pressable>
      <Text accessibilityRole="header" style={s.heading}>Deep Analysis</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Export or share analysis report" accessibilityState={{ disabled: !report }} disabled={!report} onPress={() => { if (report) exportDeepReport(deepReportText(report), report.postId).catch(() => setNotice('Export is unavailable on this device. You can copy individual findings.')); }} style={s.iconButton}><Ionicons name="share-outline" size={23} color={report ? colors.navy : colors.neutral300} /></Pressable>
    </View>
    <View style={s.identifier}><View style={s.row}>{platform ? <Ionicons name={PLATFORM_ICON[platform]} size={18} color={colors.primary} /> : null}<Text style={s.platform}>{platform ? platform[0].toUpperCase() + platform.slice(1) : 'Selected post'}{date ? ` · ${formatDate(date)}` : ''}</Text></View><Text numberOfLines={2} style={s.identifierTitle}>{identifier}</Text></View>
    <ReportTabs active={ui.tab} onChange={(tab) => { setNotice(null); dispatch({ type: 'tab', tab }); scroll.current?.scrollTo({ y: 0, animated: false }); }} />
    <ScrollView ref={scroll} contentContainerStyle={s.content}>
      {notice ? <Text accessibilityRole="alert" style={s.notice}>{notice}</Text> : null}
      {ui.loading ? <View style={s.card}><View style={s.row}><ActivityIndicator size="small" color={colors.primary} /><Text style={s.cardTitle}>{ui.job?.progress.stage || 'Preparing analysis'}</Text></View><Text style={[s.small, { marginTop: 8 }]}>{ui.job ? `${ui.job.progress.processed} of ${ui.job.progress.total} processing steps` : 'The selected post is being queued for review.'}</Text>{!report ? [88, 100, 64].map((width) => <View key={width} style={[s.skeleton, { width: `${width}%` }]} />) : null}<Text style={[s.small, { marginTop: 10 }]}>You can leave this screen while the server processes the report.</Text>{ui.job ? <Pressable accessibilityRole="button" onPress={() => void cancel()} style={s.textButton}><Text style={s.link}>Cancel analysis</Text></Pressable> : null}</View> : null}
      {ui.error ? <View style={s.card}><Text accessibilityRole="alert" style={s.body}>{ui.error}</Text><View style={{ marginTop: 12 }}><Button title="Retry analysis" variant="secondary" onPress={() => restart()} /></View></View> : null}
      {report ? <>
        {report.analysisStatus === 'partial' ? <View style={s.partial}><Ionicons name="information-circle-outline" size={18} color={colors.warning} /><Text style={[s.small, { flex: 1, color: colors.warning }]}>Partial analysis · {report.coverage.limitations[0] || 'Some content could not be independently verified.'}</Text></View> : null}
        {ui.tab === 'Overview' ? <>
          <View style={s.card}><View style={s.row}><Ionicons name="scan-outline" size={21} color={colors.primary} /><Text accessibilityRole="header" style={s.cardTitle}>Content Review</Text></View><Text style={[s.body, { color: colors.navy, marginTop: 10 }]}>{report.overview.summary}</Text>{report.overview.strongestQuality ? <Text style={[s.body, { marginTop: 9 }]}><Text style={s.bold}>Strongest quality: </Text>{report.overview.strongestQuality}</Text> : null}{report.overview.mainOpportunity ? <Text style={[s.body, { marginTop: 7 }]}><Text style={s.bold}>Main opportunity: </Text>{report.overview.mainOpportunity}</Text> : null}</View>
          <IntelligenceTimeline report={report} />
          <Text accessibilityRole="header" style={s.sectionTitle}>Priority Findings</Text><Text style={[s.small, { marginBottom: 11 }]}>The most useful supported insights. Tap to inspect the evidence.</Text>
          {report.overview.priorityFindings.length ? report.overview.priorityFindings.map((finding, i) => <PriorityFindingCard key={finding.id} finding={finding} highlighted={i === 0} expanded={Boolean(ui.expanded[finding.id])} onToggle={() => dispatch({ type: 'toggle', id: finding.id })} onCopy={() => void copy(`${finding.title}\nFinding: ${finding.finding}\nEvidence: ${finding.evidence.map((e) => `${e.startSeconds !== null ? `${timeLabel(e.startSeconds)} · ` : ''}${e.quote || e.description}`).join('\n')}\nLikely impact: ${finding.likelyImpact}\nRecommended action: ${finding.recommendedAction}`)} />) : <View style={s.card}><Text style={s.body}>There is not enough specific evidence to rank creative findings. No extra issues were invented.</Text></View>}
          <View style={[s.card, { backgroundColor: colors.sky }]}><Text accessibilityRole="header" style={s.cardTitle}>Key Takeaway</Text><Text style={[s.body, { marginTop: 7 }]}>{report.overview.keyTakeaway}</Text></View>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: Boolean(ui.expanded.coverage) }} onPress={() => dispatch({ type: 'toggle', id: 'coverage' })} style={s.textButton}><Text style={s.link}>{ui.expanded.coverage ? 'Hide' : 'View'} coverage and limitations</Text><Ionicons name={ui.expanded.coverage ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} /></Pressable>
          {ui.expanded.coverage ? <View style={s.card}><Text style={s.body}>{report.coverage.method}</Text><Text style={[s.small, { marginTop: 8 }]}>{`${report.coverage.analyzedAssets} of ${report.coverage.accessibleAssets} accessible assets assessed${report.coverage.accessibleDurationSeconds !== null ? ` · ${report.coverage.analyzedDurationSeconds}s of ${report.coverage.accessibleDurationSeconds}s has grounded segment evidence` : ''}.`}</Text>{report.coverage.limitations.map((limit, i) => <Text key={i} style={[s.small, { marginTop: 8 }]}>{limit}</Text>)}<Text style={[s.small, { marginTop: 8 }]}>The AI’s conclusions can be mistaken. Creative judgments are not measured audience outcomes.</Text></View> : null}
        </> : ui.tab === 'Audience' ? <>
          <AudiencePanel audience={report.audience} expanded={ui.expanded} onToggle={(id) => dispatch({ type: 'toggle', id })} onRefresh={() => void refreshAudience()} refreshing={audienceRefreshing} disabled={ui.loading} />
        </> : <>
          <Text accessibilityRole="header" style={s.sectionTitle}>For Your Next Content</Text><Text style={[s.body, { marginBottom: 14 }]}>A few specific things to repeat or test, grounded in this published post.</Text>
          {report.nextMove.actions.map((action) => <View key={action.id} style={s.card}><View style={s.row}><Ionicons name={action.kind === 'repeat' ? 'repeat-outline' : action.kind === 'change' ? 'options-outline' : 'bulb-outline'} size={22} color={colors.primary} /><Text style={s.cardTitle}>{ACTION_TITLE[action.kind]}</Text></View><Text style={[s.actionTitle, { marginTop: 12 }]}>{action.title}</Text><Text style={[s.body, { marginTop: 7 }]}><Text style={s.bold}>Why: </Text>{action.why}</Text><Text style={[s.body, { marginTop: 8 }]}><Text style={s.bold}>What to do: </Text>{action.what}</Text>{action.example ? <Text style={[s.body, { marginTop: 8 }]}><Text style={s.bold}>Example: </Text>{action.example}</Text> : null}<View style={[s.row, { marginTop: 10, flexWrap: 'wrap' }]}><Pressable accessibilityRole="button" accessibilityLabel={saved.includes(action.id) ? 'Unsave recommendation' : 'Save recommendation'} accessibilityState={{ disabled: Boolean(saving), selected: saved.includes(action.id) }} disabled={Boolean(saving)} onPress={() => void save(action.id)} style={s.textButton}><Ionicons name={saved.includes(action.id) ? 'bookmark' : 'bookmark-outline'} size={18} color={colors.primary} /><Text style={s.link}>{saving === action.id ? 'Saving…' : saved.includes(action.id) ? 'Saved' : 'Save Idea'}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Copy recommendation" onPress={() => void copy(`${action.title}\n${action.why}\n${action.what}${action.example ? `\n${action.example}` : ''}`)} style={s.textButton}><Ionicons name="copy-outline" size={17} color={colors.primary} /><Text style={s.link}>Copy</Text></Pressable></View></View>)}
          {!report.nextMove.actions.length ? <View style={s.card}><Text style={s.body}>There is not enough verified evidence for a specific next action yet. Retry when the original content is accessible.</Text></View> : null}
          <View style={s.card}><Text style={s.cardTitle}>Your creator goal</Text><Text style={[s.small, { marginTop: 6 }]}>{report.goal}</Text><TextInput accessibilityLabel="Goal for future content" placeholder="Optional: what do you want future content to achieve?" placeholderTextColor={colors.neutral400} maxLength={300} value={goal} onChangeText={setGoal} style={s.input} /><Button title="Analyze for this goal" variant="secondary" disabled={ui.loading || !goal.trim()} onPress={() => restart(goal.trim())} /></View>
        </>}
        {!ui.loading && ui.tab !== 'Audience' ? <View style={{ marginTop: 12 }}><Button title="Refresh analysis" variant="secondary" icon="refresh-outline" onPress={() => restart()} /></View> : null}
      </> : !ui.loading && !ui.error ? <View style={s.card}><Text style={s.body}>No report is available yet.</Text><Button title="Analyze content" onPress={() => restart()} /></View> : null}
    </ScrollView>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas }, header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingTop: 6, paddingBottom: 4 }, iconButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }, heading: { flex: 1, fontSize: 21, fontWeight: '700', color: colors.navy },
  identifier: { paddingHorizontal: 19, paddingVertical: 8 }, platform: { fontSize: 11, lineHeight: 17, color: colors.neutral500 }, identifierTitle: { fontSize: 14, lineHeight: 20, color: colors.navy, fontWeight: '600', marginTop: 5 }, row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  content: { paddingHorizontal: 16, paddingTop: 3, paddingBottom: 38, maxWidth: 720, width: '100%', alignSelf: 'center' }, card: { padding: 15, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral100, marginBottom: 12 }, cardTitle: { color: colors.navy, fontSize: 14, fontWeight: '700', lineHeight: 21, flexShrink: 1 }, body: { color: colors.neutral500, fontSize: 13, lineHeight: 20 }, small: { color: colors.neutral500, fontSize: 11, lineHeight: 17 }, bold: { color: colors.navy, fontWeight: '600' },
  sectionTitle: { color: colors.navy, fontSize: 16, fontWeight: '700', marginBottom: 5 }, timeline: { flexDirection: 'row', gap: 1, marginTop: 14, marginBottom: 6, borderRadius: 9, overflow: 'hidden' }, textButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7 }, link: { color: colors.primary, fontSize: 12, fontWeight: '600' }, partial: { flexDirection: 'row', gap: 7, padding: 11, borderRadius: 11, backgroundColor: colors.warningLight, marginBottom: 12 }, sourceLabel: { color: colors.primary, fontSize: 10, marginTop: 4, marginBottom: 9 }, actionTitle: { color: colors.navy, fontSize: 15, fontWeight: '700', lineHeight: 22 },
  skeleton: { height: 11, borderRadius: 6, backgroundColor: colors.neutral100, marginTop: 13 }, notice: { backgroundColor: colors.sky, padding: 11, borderRadius: 10, color: colors.navy, fontSize: 12, marginBottom: 11 }, input: { color: colors.navy, borderWidth: 1, borderColor: colors.neutral200, borderRadius: 9, padding: 11, marginVertical: 12, fontSize: 12, minHeight: 46 },
});
