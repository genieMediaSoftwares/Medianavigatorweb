import type { DeepAnalysisV2 } from './deepAnalysisV2.js';
export function deepReportText(report: DeepAnalysisV2): string {
  const lines = ['Media Navigator — Deep Analysis', `${report.platform} · ${report.post.title || report.post.caption.slice(0, 100)}`, `Post: ${report.postId}`, `Published: ${report.post.publishedAt}`, `Generated: ${report.generatedAt}`, `Status: ${report.analysisStatus}`, `Goal: ${report.goal}`, '', 'Overview', report.overview.summary];
  for (const f of report.overview.priorityFindings) {
    lines.push('', `${f.category.replaceAll('_', ' ')} — ${f.status.replaceAll('_', ' ')}`, `Finding: ${f.finding}`, 'Evidence:');
    for (const e of f.evidence) lines.push(`- ${e.id}${e.startSeconds !== null ? ` [${e.startSeconds}s–${e.endSeconds}s]` : ''}${e.slideNumber ? ` [slide ${e.slideNumber}]` : ''}: ${e.quote || e.description}`);
    lines.push(`Likely impact (${f.claimType}): ${f.likelyImpact}`, `Recommended action: ${f.recommendedAction}`);
  }
  lines.push('', 'Key takeaway', report.overview.keyTakeaway, '', 'Audience');
  if (!report.audience.findings.length) lines.push('Audience feedback is not available for this post. We won’t guess what viewers thought.');
  for (const f of report.audience.findings) {
    lines.push(`${f.title} (${f.label}): ${f.text}`);
    for (const e of f.evidence) lines.push(`- ${e.id}: ${e.quote || e.description}`);
  }
  lines.push('', 'Next Move');
  for (const a of report.nextMove.actions) lines.push(`${a.title}\nWhy: ${a.why}\nWhat to do: ${a.what}${a.example ? `\nExample: ${a.example}` : ''}`);
  lines.push('', 'Coverage', report.coverage.method, ...report.coverage.limitations, '', 'Audience limitations', ...report.audience.limitations);
  return lines.join('\n');
}
