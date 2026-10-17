import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { DEEP_TABS, type DeepTab } from '../../../../shared/deepAnalysisUi';
import type { DeepSource, TimelineStatus, PriorityFinding } from '../../../../shared/deepAnalysisV2';

export const statusStyle: Record<TimelineStatus, { label: string; color: string; background: string; timeline: string }> = {
  strong: { label: 'Strong', color: colors.success, background: colors.successLight, timeline: colors.success },
  good: { label: 'Good', color: colors.success, background: colors.successLight, timeline: colors.successMid },
  review: { label: 'Review', color: colors.warning, background: colors.warningLight, timeline: colors.warning },
  needs_attention: { label: 'Needs Attention', color: colors.danger, background: colors.dangerLight, timeline: colors.danger },
  insufficient_evidence: { label: 'Insufficient Evidence', color: colors.neutral500, background: colors.neutral100, timeline: colors.neutral300 },
};
export const timeLabel = (time: number) => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
export const categoryLabel = (name: string) => name.split('_').map((w) => w === 'cta' ? 'CTA' : w[0].toUpperCase() + w.slice(1)).join(' ');
export function ReportTabs({ active, onChange }: { active: DeepTab; onChange: (tab: DeepTab) => void }) {
  return <View accessibilityRole="tablist" style={p.tabs}>{DEEP_TABS.map((tab) => <Pressable key={tab} accessibilityRole="tab" accessibilityLabel={tab} accessibilityState={{ selected: tab === active }} onPress={() => onChange(tab)} style={[p.tab, tab === active && p.activeTab]}><Text style={[p.tabText, tab === active && { color: colors.white }]}>{tab}</Text></Pressable>)}</View>;
}
export function SourceEvidence({ sources }: { sources: DeepSource[] }) {
  return <View style={{ gap: 8 }}>{sources.map((e) => <View key={e.id}><Text style={p.source}>{`${e.claimType === 'measured' ? 'Measured' : 'Observed'}${e.slideNumber ? ` · Slide ${e.slideNumber}` : ''}${e.startSeconds !== null ? ` · ${timeLabel(e.startSeconds)}${e.endSeconds !== null && e.endSeconds !== e.startSeconds ? `–${timeLabel(e.endSeconds)}` : ''}` : ''} · ${e.source.replaceAll('_', ' ')}`}</Text><Text style={p.body}>{e.quote ? `“${e.quote}”` : e.description}</Text></View>)}</View>;
}
export function PriorityFindingCard({ finding, expanded, highlighted, onToggle, onCopy }: { finding: PriorityFinding; expanded: boolean; highlighted: boolean; onToggle: () => void; onCopy: () => void }) {
  const grade = statusStyle[finding.status];
  return <View style={[p.card, highlighted && { borderColor: colors.skyBorder }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${categoryLabel(finding.category)}. ${finding.title}. ${grade.label}. ${expanded ? 'Collapse' : 'Expand'} evidence`} accessibilityState={{ expanded }} onPress={onToggle} style={p.findingHeader}>
      <View style={p.number}><Text style={p.numberText}>{finding.priority}</Text></View>
      <View style={{ flex: 1 }}><Text style={p.category}>{categoryLabel(finding.category)}</Text><Text style={p.findingTitle}>{finding.title}</Text></View><Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} color={colors.primary} size={19} />
    </Pressable>
    <View style={{ paddingHorizontal: 13, paddingBottom: 13 }}><Text style={[p.badge, { color: grade.color, backgroundColor: grade.background }]}>{grade.label}</Text><Text style={[p.body, { marginTop: 7 }]}>{finding.explanation}</Text></View>
    {expanded ? <View style={p.expanded}>
      <View style={p.element}><Text style={p.elementTitle}>1. Finding</Text><Text style={p.body}>{finding.finding}</Text></View>
      <View style={p.element}><Text style={p.elementTitle}>2. Evidence</Text><SourceEvidence sources={finding.evidence} /></View>
      <View style={p.element}><Text style={p.elementTitle}>3. Likely Impact</Text><Text style={p.body}>{finding.likelyImpact}</Text><Text style={p.source}>AI interpretation · {finding.confidence} confidence · possible effect</Text></View>
      <View style={p.element}><Text style={p.elementTitle}>4. Recommended Action</Text><Text style={p.body}>{finding.recommendedAction}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Copy finding and evidence" onPress={onCopy} style={p.copy}><Ionicons name="copy-outline" size={17} color={colors.primary} /><Text style={p.copyLabel}>Copy finding</Text></Pressable>
    </View> : null}
  </View>;
}
const p = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 5, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.canvas },
  tab: { flex: 1, minHeight: 46, borderRadius: 13, backgroundColor: colors.neutral100, alignItems: 'center', justifyContent: 'center' }, activeTab: { backgroundColor: colors.navy }, tabText: { fontSize: 13, color: colors.navy, fontWeight: '600' },
  card: { borderWidth: 1, borderColor: colors.neutral100, borderRadius: 15, backgroundColor: colors.white, marginBottom: 10, overflow: 'hidden' }, findingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, minHeight: 62 }, number: { width: 29, height: 29, borderRadius: 15, backgroundColor: colors.sky, alignItems: 'center', justifyContent: 'center' }, numberText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  category: { fontSize: 11, lineHeight: 16, color: colors.primary, marginBottom: 3 }, findingTitle: { fontSize: 14, lineHeight: 20, color: colors.navy, fontWeight: '700' }, badge: { fontSize: 10, lineHeight: 16, fontWeight: '600', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden', alignSelf: 'flex-start' }, body: { color: colors.neutral500, fontSize: 13, lineHeight: 20 },
  expanded: { paddingHorizontal: 15, borderTopWidth: 1, borderTopColor: colors.neutral100 }, element: { paddingVertical: 11, gap: 7 }, elementTitle: { color: colors.navy, fontSize: 13, fontWeight: '700' }, source: { color: colors.neutral500, fontSize: 10, lineHeight: 16, marginBottom: 3 }, copy: { flexDirection: 'row', gap: 7, alignItems: 'center', minHeight: 44, marginBottom: 7 }, copyLabel: { color: colors.primary, fontSize: 12, fontWeight: '600' },
});
