import type { AudienceFinding } from './deepAnalysisV2.js';
export const AUDIENCE_SECTIONS = [
  { id: 'response', title: 'What connected with people', subtitle: 'Themes and moments reflected in audience feedback', empty: 'There is not enough accessible feedback to identify what connected with people.' },
  { id: 'questions', title: 'Questions people asked', subtitle: 'Recurring questions and unanswered concerns', empty: 'No recurring questions were established from the accessible comments and replies.' },
  { id: 'motivations', title: 'Why people might save or share', subtitle: 'Motivations supported by comments and available insights', empty: 'No explicit reason for saving or sharing is available in the comments. Counts alone cannot explain people’s motivations.' },
  { id: 'demand', title: 'Unanswered content demand', subtitle: 'Topics worth exploring based on audience signals', empty: 'There are not enough repeated requests to identify a supported next topic.' },
] as const;
export function audienceSectionFindings(findings: AudienceFinding[], section: typeof AUDIENCE_SECTIONS[number]['id']): AudienceFinding[] {
  return findings.filter((finding) => finding.section === section);
}
