import type { DeepAnalysisV2 } from './deepAnalysisV2.js';
export function deepReportText(report: DeepAnalysisV2): string {
  const lines = ['Media Navigator — Deep Analysis', `${report.platform} · ${report.post.title || report.post.caption.slice(0, 100)}`, `Post: ${report.postId}`, `Published: ${report.post.publishedAt}`, `Generated: ${report.generatedAt}`, `Content assessed: ${report.coverage.analyzedAssets} of ${report.coverage.accessibleAssets} available assets`, `Goal: ${report.goal}`, '', 'Overview'];
  const editorial = report.overview.editorial;
  if (!editorial) lines.push(report.overview.summary);
  if (editorial) {
    lines.push(editorial.headline, editorial.introduction);
    for (const fact of editorial.facts) lines.push(fact.label + ': ' + fact.value);
    for (const section of editorial.sections) lines.push('', section.title, section.assessment);
    lines.push('', 'Platform snapshot (last synced ' + editorial.metrics.syncedAt + ')');
    for (const metric of editorial.metrics.items) lines.push(metric.label + ': ' + metric.value + (metric.unit === 'percent' ? '%' : metric.unit === 'minutes' ? ' min' : ''));
    lines.push('', 'Overall assessment', editorial.verdict);
  }
  for (const f of editorial ? [] : report.overview.priorityFindings) {
    lines.push('', `${f.category.replaceAll('_', ' ')} — ${f.status.replaceAll('_', ' ')}`, `Finding: ${f.finding}`, 'Evidence:');
    for (const e of f.evidence) lines.push(`- ${e.id}${e.startSeconds !== null ? ` [${e.startSeconds}s–${e.endSeconds}s]` : ''}${e.slideNumber ? ` [slide ${e.slideNumber}]` : ''}: ${e.quote || e.description}`);
    lines.push(`Likely impact (${f.claimType}): ${f.likelyImpact}`, `Recommended action: ${f.recommendedAction}`);
  }
  if (!editorial) lines.push('', 'Key takeaway', report.overview.keyTakeaway);
  lines.push('', 'Audience');
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
