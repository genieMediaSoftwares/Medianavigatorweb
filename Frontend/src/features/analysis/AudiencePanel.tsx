import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import type { DeepAnalysisV2 } from '../../../../shared/deepAnalysisV2';
import { SourceEvidence } from './DeepReportParts';
import { audienceDate, audienceSummary } from './audienceSummary';

const TITLES = { response: 'What the comments say', questions: 'Questions in the comments', motivations: 'Explicit reasons for saving or sharing', demand: 'Topics people requested', signals: 'Post activity' };
const LABELS = { measured: 'Measured', observed_in_comments: 'Observed in comments', ai_interpretation: 'AI interpretation' };

export function AudiencePanel({ audience, expanded, onToggle, onRefresh, refreshing, disabled = false }: {
  audience: DeepAnalysisV2['audience']; expanded: Record<string, boolean>; onToggle: (id: string) => void;
  onRefresh: () => void; refreshing: boolean; disabled?: boolean;
}) {
  const summary = audienceSummary(audience);
  const scopeOpen = Boolean(expanded.audience_scope);
  const checkedAt = audienceDate(audience.collectedAt);
  return <View>
    <View style={a.intro}>
      <Text style={a.eyebrow}>AUDIENCE RESPONSE</Text>
      <Text accessibilityRole="header" style={a.headline}>{summary.headline}</Text>
      <Text style={a.body}>{summary.summary}</Text>
      {checkedAt ? <Text style={[a.small, a.space]}>Feedback checked {checkedAt}</Text> : null}
    </View>
    <View style={a.card}>
      <Text accessibilityRole="header" style={a.title}>This post’s activity</Text>
      <Text style={[a.small, a.space]}>Recorded platform counts. These are not unique people or a sentiment score.</Text>
      {summary.metrics.length ? <View style={a.grid}>{summary.metrics.map((metric) => <View key={metric.id} style={a.metric}>
        <Text style={a.value}>{metric.value.toLocaleString()}</Text>
        <Text style={a.small}>{metric.label}</Text>
        {audienceDate(metric.syncedAt) ? <Text style={a.date}>Synced {audienceDate(metric.syncedAt)}</Text> : null}
      </View>)}</View> : <Text style={[a.body, a.space]}>No measured activity is available in this report yet.</Text>}
      <Text style={[a.small, a.space]}>Missing metrics are unavailable, not zero. Refreshing feedback checks comments; sync the account to update activity counts.</Text>
    </View>
    {summary.findings.map((finding) => {
      const key = `audience_finding_${finding.id}`;
      const open = Boolean(expanded[key]);
      const evidence = finding.evidence.filter((source) => source.source === 'comment' && source.quote);
      return <View key={finding.id} style={a.card}>
        <Text style={a.eyebrow}>{TITLES[finding.section]}</Text>
        <Text accessibilityRole="header" style={[a.title, a.space]}>{finding.title}</Text>
        <Text style={[a.body, a.space]}>{finding.text}</Text>
        <Text style={[a.small, a.space]}>{LABELS[finding.label]} · {evidence.length} supporting {evidence.length === 1 ? 'comment' : 'comments'}</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={open ? 'Hide supporting comments' : 'Read supporting comments'} onPress={() => onToggle(key)} style={a.trigger}>
          <Text style={a.link}>{open ? 'Hide supporting comments' : 'Read supporting comments'}</Text><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={17} color={colors.primary} />
        </Pressable>
        {open ? <SourceEvidence sources={evidence} /> : null}
      </View>;
    })}
    <View style={a.action}>
      <Text style={a.eyebrow}>A PRACTICAL NEXT STEP</Text>
      <Text accessibilityRole="header" style={a.headline}>{summary.actionTitle}</Text>
      <Text style={a.body}>{summary.action}</Text>
      <Text style={[a.small, a.space]}>Suggested action, not a measured outcome or a promise of more engagement.</Text>
    </View>
    <Button title="Refresh audience feedback" icon="refresh-outline" variant="secondary" loading={refreshing} disabled={disabled || refreshing} onPress={onRefresh} />
    <Text style={[a.small, { marginTop: 8, marginBottom: 16 }]}>Checks available comments and replies for this post without regenerating Overview.</Text>
    <View style={a.card}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: scopeOpen }} onPress={() => onToggle('audience_scope')} style={a.trigger}>
        <Text style={[a.title, { flex: 1 }]}>What this audience review covers</Text><Ionicons name={scopeOpen ? 'chevron-up' : 'chevron-down'} size={19} color={colors.neutral500} />
      </Pressable>
      {scopeOpen ? <View>
        <Text style={a.body}>{audience.sampledComments} comments / replies reviewed. No age, gender, location or follower profile is inferred from this post.</Text>
        <Text style={[a.small, a.space]}>Comment themes appear only when supported by returned feedback. Missing sections do not prove those interests are absent.</Text>
        {[...new Set(audience.limitations)].map((limit, index) => <Text key={index} style={[a.small, a.space]}>{limit}</Text>)}
        {summary.unparsedSignals.length ? <View style={a.space}><SourceEvidence sources={summary.unparsedSignals} /></View> : null}
      </View> : null}
    </View>
  </View>;
}

const a = StyleSheet.create({
  intro: { borderRadius: 18, backgroundColor: colors.white, padding: 20, marginBottom: 16 },
  eyebrow: { color: colors.primary, fontSize: 11, lineHeight: 17, fontWeight: '700' },
  headline: { color: colors.navy, fontSize: 20, lineHeight: 28, fontWeight: '700', marginTop: 8, marginBottom: 10 },
  card: { borderWidth: 1, borderColor: colors.neutral200, backgroundColor: colors.white, borderRadius: 16, padding: 18, marginBottom: 16 },
  title: { color: colors.navy, fontSize: 15, lineHeight: 23, fontWeight: '700' },
  body: { color: colors.navyLight, fontSize: 14, lineHeight: 23 }, small: { color: colors.neutral500, fontSize: 12, lineHeight: 19 },
  space: { marginTop: 10 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  metric: { flexBasis: '45%', flexGrow: 1, backgroundColor: colors.canvas, padding: 12, borderRadius: 12 },
  value: { color: colors.navy, fontSize: 25, fontWeight: '700', lineHeight: 33 }, date: { color: colors.neutral500, fontSize: 10, lineHeight: 16, marginTop: 6 },
  trigger: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, link: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  action: { backgroundColor: colors.sky, borderRadius: 18, padding: 20, marginBottom: 16 },
});
