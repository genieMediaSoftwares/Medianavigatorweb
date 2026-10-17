import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import type { DeepAnalysisV2 } from '../../../../shared/deepAnalysisV2';
import { AUDIENCE_SECTIONS, audienceSectionFindings } from '../../../../shared/audienceSections';
import { SourceEvidence } from './DeepReportParts';

const ICONS = { response: 'heart-outline', questions: 'chatbubbles-outline', motivations: 'bookmark-outline', demand: 'bulb-outline' } as const;
const LABELS = { measured: 'Measured', observed_in_comments: 'Observed in comments', ai_interpretation: 'AI interpretation' } as const;

/** Four inline dropdowns; never pushes another screen or infers opinions from counts. */
export function AudiencePanel({ audience, expanded, onToggle, onRefresh, refreshing, disabled = false }: {
  audience: DeepAnalysisV2['audience']; expanded: Record<string, boolean>; onToggle: (id: string) => void;
  onRefresh: () => void; refreshing: boolean; disabled?: boolean;
}) {
  const signals = audience.findings.filter((finding) => finding.section === 'signals');
  return <View>
    <View style={a.intro}>
      <Ionicons name="people-outline" size={21} color={colors.navy} />
      <Text accessibilityRole="header" style={a.introTitle}>Understand Your Audience</Text>
      <Text style={a.introBody}>Find out what people responded to, what questions they raised and what they want to see next.</Text>
    </View>
    {AUDIENCE_SECTIONS.map((section) => {
      const key = `audience_dropdown_${section.id}`;
      const open = Boolean(expanded[key]);
      const findings = audienceSectionFindings(audience.findings, section.id);
      return <View key={section.id} style={a.card}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${section.title}. ${open ? 'Collapse' : 'Expand'}`} accessibilityState={{ expanded: open }} onPress={() => onToggle(key)} style={a.trigger}>
          <Ionicons name={ICONS[section.id]} size={23} color={colors.neutral500} />
          <View style={{ flex: 1 }}><Text style={a.title}>{section.title}</Text><Text style={a.subtitle}>{section.subtitle}</Text></View>
          <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={19} color={colors.neutral400} />
        </Pressable>
        {open ? <View style={a.details}>
          {findings.length ? findings.map((finding) => <View key={finding.id} style={{ marginBottom: 9 }}>
            <Text style={a.label}>{LABELS[finding.label]} · {finding.confidence} confidence</Text>
            <Text style={a.body}>{finding.text}</Text>
            <Text style={a.evidenceTitle}>Supporting evidence</Text><SourceEvidence sources={finding.evidence} />
          </View>) : <View><Text style={a.unavailable}>Insufficient data</Text><Text style={a.body}>{section.empty}</Text></View>}
          {section.id === 'motivations' && signals.length ? <View style={a.signals}><Text style={a.evidenceTitle}>Available platform signals</Text><Text style={[a.small, { marginBottom: 9 }]}>These measured counts show activity, not the reasons people saved or shared.</Text>{signals.map((finding) => <SourceEvidence key={finding.id} sources={finding.evidence} />)}</View> : null}
          {section.id === 'demand' && findings.length ? <Text style={[a.small, { marginTop: 10 }]}>These are requested topics, not proof that the creator has never answered them. Other replies or content may be unavailable.</Text> : null}
          {!audience.sampledComments ? <Text style={[a.small, { marginTop: 10 }]}>Audience feedback is not available for this post. We won’t guess what viewers thought.</Text> : null}
        </View> : null}
      </View>;
    })}
    <Text style={a.footer}>Audience conclusions must come from actual comments, replies and available platform data. Unavailable states are shown where evidence is missing.</Text>
    <Text style={a.small}>{audience.sampledComments ? `${audience.sampledComments} accessible comments / replies reviewed. This sample may not represent everyone.` : 'No accessible comments or replies are included in this report.'}</Text>
    {audience.limitations.map((limit, index) => <Text key={index} style={[a.small, { marginTop: 6 }]}>{limit}</Text>)}
    <View style={{ marginTop: 16 }}><Button title="Refresh audience feedback" icon="refresh-outline" variant="secondary" loading={refreshing} disabled={disabled || refreshing} onPress={onRefresh} /></View>
    <Text style={[a.small, { marginTop: 7 }]}>Refreshes available feedback for this post without reprocessing the creative report.</Text>
  </View>;
}

const a = StyleSheet.create({
  intro: { borderRadius: 16, backgroundColor: colors.white, padding: 16, marginBottom: 16 }, introTitle: { color: colors.navy, fontSize: 17, fontWeight: '700', marginTop: 8, marginBottom: 10 }, introBody: { color: colors.navy, fontSize: 14, lineHeight: 22 },
  card: { borderWidth: 1, borderColor: colors.neutral200, backgroundColor: colors.white, borderRadius: 16, marginBottom: 13, overflow: 'hidden' }, trigger: { paddingHorizontal: 15, paddingVertical: 17, minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 13 }, title: { color: colors.navy, fontSize: 14, lineHeight: 21, fontWeight: '700' }, subtitle: { color: colors.neutral500, fontSize: 13, lineHeight: 20, marginTop: 5 },
  details: { padding: 16, borderTopWidth: 1, borderTopColor: colors.neutral100 }, body: { color: colors.navy, fontSize: 13, lineHeight: 21 }, label: { color: colors.primary, fontSize: 11, lineHeight: 17, marginBottom: 8 }, evidenceTitle: { color: colors.navy, fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 8 }, unavailable: { color: colors.neutral500, fontSize: 11, fontWeight: '600', marginBottom: 8 }, signals: { marginTop: 13, borderTopWidth: 1, borderTopColor: colors.neutral100 }, small: { color: colors.neutral500, fontSize: 11, lineHeight: 17 }, footer: { color: colors.neutral500, fontSize: 13, lineHeight: 20, marginTop: 7, marginBottom: 10 },
});
