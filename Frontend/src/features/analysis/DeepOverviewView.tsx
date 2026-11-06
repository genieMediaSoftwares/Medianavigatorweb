import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { formatDate } from '@/lib/format';
import { OVERVIEW_LABELS, type OverviewSectionKey } from '../../../../shared/deepOverview';
import type { DeepAnalysisV2, DeepAction } from '../../../../shared/deepAnalysisV2';
import { deepEvidenceScope } from './deepEvidenceScope';

const ICONS = { message: 'chatbox-ellipses-outline', visual: 'image-outline', caption: 'document-text-outline', structure: 'layers-outline', audio: 'musical-notes-outline', details: 'list-outline', alignment: 'git-compare-outline', cta: 'navigate-outline' } as const;
const GRADES = { strong: { label: 'Works well', color: colors.success, background: colors.successLight }, good: { label: 'Balanced', color: colors.primary, background: colors.sky }, needs_attention: { label: 'Worth refining', color: colors.warning, background: colors.warningLight } } as const;
interface Props {
  report: DeepAnalysisV2; expanded: Record<string, boolean>; onToggle: (key: string) => void;
  onCopy: (value: string) => void; onSave: (id: string) => void; saved: string[]; saving: string | null; timeline?: ReactNode;
}
function Recommendation({ action, index, saved, saving, onSave, onCopy }: { action: DeepAction; index: number } & Pick<Props, 'saved' | 'saving' | 'onSave' | 'onCopy'>) {
  return <View style={s.recommendation}>
    <View style={s.row}><View style={s.step}><Text style={s.stepText}>{index + 1}</Text></View><Text style={s.recommendationTitle}>{action.title}</Text></View>
    <Text style={s.body}>{action.what}</Text><Text style={s.reason}>{action.why}</Text>
    {action.example ? <View style={s.example}><Text style={s.eyebrow}>PROPOSED COPY / EXECUTION</Text><Text style={s.body}>{action.example}</Text></View> : null}
    <View style={s.row}><Pressable accessibilityRole="button" accessibilityLabel={saved.includes(action.id) ? 'Unsave recommendation' : 'Save recommendation'} disabled={Boolean(saving)} onPress={() => onSave(action.id)} style={s.linkButton}><Ionicons name={saved.includes(action.id) ? 'bookmark' : 'bookmark-outline'} size={16} color={colors.primary} /><Text style={s.link}>{saving === action.id ? 'Saving…' : saved.includes(action.id) ? 'Saved' : 'Save idea'}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => onCopy(`${action.title}\n${action.what}\n${action.why}${action.example ? `\nProposed example: ${action.example}` : ''}`)} style={s.linkButton}><Ionicons name="copy-outline" size={15} color={colors.primary} /><Text style={s.link}>Copy</Text></Pressable></View>
  </View>;
}
export function DeepOverviewView({ report, expanded, onToggle, onCopy, onSave, saved, saving, timeline }: Props) {
  const review = report.overview.editorial;
  const sources = report.processing.sources;
  const scope = deepEvidenceScope(report);
  const textOnly = sources.length > 0 && sources.every((source) => ['caption', 'title'].includes(source.source));
  const format = report.mediaType === 'post' ? 'Image post' : report.mediaType[0].toUpperCase() + report.mediaType.slice(1);
  const captionKey = 'overview_full_caption';
  return <View>
    <View style={s.hero}>
      <View style={[s.row, { justifyContent: 'space-between', marginBottom: 15 }]}><Text style={s.heroEyebrow}>THE POST REVIEW</Text><View style={s.format}><Text style={s.formatText}>{format}</Text></View></View>
      <Text accessibilityRole="header" style={s.headline}>{review?.headline || 'Your post, in focus'}</Text>
      <Text style={s.introduction}>{review?.introduction || report.overview.summary}</Text>
      <View style={s.heroFooter}><Ionicons name="time-outline" size={13} color={colors.onDarkMuted} /><Text style={s.heroMeta}>Reviewed {formatDate(report.generatedAt)} · Based on this post</Text></View>
    </View>
    {textOnly && report.mediaType !== 'text' ? <View style={s.scope}><Ionicons name="document-text-outline" size={18} color={colors.primary} /><Text style={s.reason}>This review covers the available post text. The original visual media could not be reviewed. Reconnect the owning account and refresh to include it.</Text></View> : null}
    {review?.facts.length ? <View style={s.card}>
      <Text style={s.eyebrow}>AT A GLANCE</Text><Text accessibilityRole="header" style={s.heading}>The details in this post</Text>
      <View style={s.facts}>{review.facts.map((fact, index) => <View key={index} style={s.fact}><Text style={s.factLabel}>{fact.label}</Text><Text selectable style={s.factValue}>{fact.value}</Text></View>)}</View>
    </View> : null}
    <View style={s.sectionIntro}><Text style={s.eyebrow}>CREATIVE ASSESSMENT</Text><Text accessibilityRole="header" style={s.heading}>How the post comes together</Text><Text style={s.reason}>The message, the creative and the copy—reviewed in context.</Text></View>
    {review?.sections.map((section) => <View key={section.key} style={s.card}>
      <View style={[s.row, { justifyContent: 'space-between' }]}><View style={s.row}><View style={s.icon}><Ionicons name={ICONS[section.key]} size={19} color={colors.primary} /></View><Text style={s.dimension}>{OVERVIEW_LABELS[section.key as OverviewSectionKey]}</Text></View><View style={[s.grade, { backgroundColor: GRADES[section.status].background }]}><Text style={[s.gradeText, { color: GRADES[section.status].color }]}>{GRADES[section.status].label}</Text></View></View>
      <Text accessibilityRole="header" style={s.assessmentTitle}>{section.title}</Text><Text style={s.body}>{section.assessment}</Text>
      {section.key === 'structure' ? timeline : null}
    </View>)}
    {!review ? <View style={s.card}><Text style={s.body}>Refresh this report to receive the detailed creative, caption and information review.</Text></View> : null}
    {report.post.caption ? <View style={s.card}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: Boolean(expanded[captionKey]) }} onPress={() => onToggle(captionKey)} style={[s.row, { justifyContent: 'space-between', minHeight: 32 }]}><View style={s.row}><Ionicons name="document-text-outline" size={18} color={colors.primary} /><Text style={s.dimension}>Read the original caption</Text></View><Ionicons name={expanded[captionKey] ? 'chevron-up' : 'chevron-down'} size={17} color={colors.primary} /></Pressable>
      {expanded[captionKey] ? <Text selectable style={[s.body, { marginTop: 15 }]}>{report.post.caption}</Text> : null}
    </View> : null}
    {review ? <View style={s.card}>
      <Text style={s.eyebrow}>PLATFORM SNAPSHOT</Text><Text accessibilityRole="header" style={s.heading}>What the numbers show</Text><Text style={s.reason}>Latest synced values for this post. Counts describe activity; they do not prove its cause.</Text>
      <View style={s.metrics}>{review.metrics.items.map((metric) => <View key={metric.key} style={s.metric}><Text style={s.metricValue}>{metric.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}{metric.unit === 'percent' ? '%' : metric.unit === 'minutes' ? ' min' : ''}</Text><Text style={s.factLabel}>{metric.label}</Text></View>)}</View>
      {!review.metrics.items.length ? <Text style={s.body}>Platform measurements are not available for this post yet.</Text> : null}<Text style={s.note}>Synced {formatDate(review.metrics.syncedAt)}. Unavailable metrics are omitted.</Text>
    </View> : null}
    <View style={s.card}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: Boolean(expanded.overview_review_details) }} onPress={() => onToggle('overview_review_details')} style={[s.row, { justifyContent: 'space-between', minHeight: 32 }]}><View style={s.row}><Ionicons name="information-circle-outline" size={18} color={colors.primary} /><Text style={s.dimension}>What this review covers</Text></View><Ionicons name={expanded.overview_review_details ? 'chevron-up' : 'chevron-down'} size={17} color={colors.primary} /></Pressable>
      {expanded.overview_review_details ? <View style={{ marginTop: 13 }}><Text style={s.body}>{scope.detail}</Text><Text style={s.note}>{report.coverage.method}</Text><Text style={s.note}>{report.coverage.analyzedAssets} of {report.coverage.accessibleAssets} available content assets assessed.</Text>{[...report.coverage.limitations, ...(report.coverage.notes ?? [])].map((note, i) => <Text key={i} style={s.note}>{note}</Text>)}<Text style={s.note}>Creative assessments are AI interpretations grounded in the cited material. They do not measure audience retention or conversion.</Text></View> : null}
    </View>
    <View style={s.verdict}><Text style={s.eyebrow}>THE OVERALL READ</Text><Text accessibilityRole="header" style={s.heading}>What stands out</Text><Text style={s.body}>{review?.verdict || report.overview.keyTakeaway}</Text></View>
    <View style={s.sectionIntro}><Text style={s.eyebrow}>RECOMMENDATIONS</Text><Text accessibilityRole="header" style={s.heading}>What to refine or carry forward</Text><Text style={s.reason}>Practical steps drawn from the review above.</Text></View>
    {report.nextMove.actions.map((action, index) => <Recommendation key={action.id} {...{ action, index, saved, saving, onSave, onCopy }} />)}
    {!report.nextMove.actions.length ? <View style={s.card}><Text style={s.body}>No specific change is supported by the available evidence.</Text></View> : null}
  </View>;
}
const s = StyleSheet.create({
  hero: { padding: 22, borderRadius: 22, backgroundColor: colors.navy, marginBottom: 18 }, heroEyebrow: { color: colors.onDarkMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.7 }, format: { backgroundColor: colors.onDarkSubtle, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 20 }, formatText: { color: colors.white, fontSize: 10, fontWeight: '600' }, headline: { color: colors.white, fontSize: 24, lineHeight: 32, fontWeight: '700', letterSpacing: -.4 }, introduction: { color: colors.white, opacity: .9, fontSize: 14, lineHeight: 24, marginTop: 15 }, heroFooter: { borderTopWidth: 1, borderTopColor: colors.onDarkSubtle, paddingTop: 14, marginTop: 19, flexDirection: 'row', alignItems: 'center', gap: 6 }, heroMeta: { color: colors.onDarkMuted, fontSize: 10, lineHeight: 17 },
  card: { backgroundColor: colors.white, borderRadius: 19, borderWidth: 1, borderColor: colors.neutral100, padding: 18, marginBottom: 14 }, row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: colors.primary, marginBottom: 8 }, heading: { color: colors.navy, fontSize: 19, lineHeight: 27, fontWeight: '700', marginBottom: 7 }, body: { color: colors.navyLight, fontSize: 14, lineHeight: 24 }, reason: { color: colors.neutral500, fontSize: 12, lineHeight: 20, flexShrink: 1 }, sectionIntro: { paddingHorizontal: 3, paddingTop: 13, paddingBottom: 16 }, dimension: { color: colors.navy, fontSize: 11, fontWeight: '700', flexShrink: 1 }, icon: { width: 33, height: 33, borderRadius: 10, backgroundColor: colors.sky, justifyContent: 'center', alignItems: 'center' }, assessmentTitle: { color: colors.navy, fontSize: 17, fontWeight: '700', lineHeight: 25, marginTop: 16, marginBottom: 10 }, grade: { paddingVertical: 5, paddingHorizontal: 7, borderRadius: 20 }, gradeText: { fontSize: 9, fontWeight: '600' }, linkButton: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, marginTop: 7 }, link: { color: colors.primary, fontSize: 11, fontWeight: '600' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }, fact: { backgroundColor: colors.neutral100, borderRadius: 12, padding: 12, flexGrow: 1, flexBasis: '45%' }, factLabel: { color: colors.neutral500, fontSize: 10, lineHeight: 17 }, factValue: { color: colors.navy, fontSize: 13, fontWeight: '600', lineHeight: 21, marginTop: 4 }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }, metric: { flexBasis: '45%', flexGrow: 1, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral100 }, metricValue: { color: colors.navy, fontSize: 23, fontWeight: '700', marginBottom: 5 }, note: { color: colors.neutral500, fontSize: 11, lineHeight: 18, marginTop: 9 }, verdict: { backgroundColor: colors.sky, borderRadius: 19, padding: 20, marginVertical: 6 }, recommendation: { borderWidth: 1, borderColor: colors.skyBorder, borderRadius: 19, backgroundColor: colors.white, padding: 18, gap: 9, marginBottom: 13 }, step: { backgroundColor: colors.sky, borderRadius: 12, width: 27, height: 27, alignItems: 'center', justifyContent: 'center' }, stepText: { color: colors.primary, fontSize: 12, fontWeight: '700' }, recommendationTitle: { color: colors.navy, fontSize: 15, lineHeight: 22, fontWeight: '700', flex: 1 }, example: { padding: 13, borderRadius: 12, backgroundColor: colors.neutral100 }, scope: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', padding: 14, borderRadius: 14, backgroundColor: colors.sky, marginBottom: 16 },
});
