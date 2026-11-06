import type { DeepAnalysisV2 } from '../../../../shared/deepAnalysisV2';

type Audience = DeepAnalysisV2['audience'];
const metricLabels: Record<string, string> = { metric_likes: 'Likes / reactions', metric_comments: 'Comments', metric_shares: 'Shares', metric_saves: 'Saves', metric_reach: 'Reach', metric_views: 'Views', metric_watchTimeMinutes: 'Watch time (minutes)' };

export function audienceDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Read the measured evidence contract from existing reports; never turn missing metrics into zero. */
export function audienceSummary(audience: Audience) {
  const sources = audience.findings.filter((f) => f.section === 'signals').flatMap((f) => f.evidence);
  const metrics = sources.flatMap((source) => {
    const label = metricLabels[source.id];
    const match = source.description.match(/^.+?: (\d+(?:\.\d+)?)\. Platform sync: (.+)\.$/);
    if (!label || source.source !== 'metric' || source.claimType !== 'measured' || !match) return [];
    const value = Number(match[1]);
    if (!Number.isFinite(value)) return [];
    return [{ id: source.id, label, value, syncedAt: match[2] }];
  }).filter((metric, index, all) => all.findIndex((other) => other.id === metric.id) === index);
  const findings = audience.findings.filter((f) => f.section !== 'signals' && f.evidence.some((e) => e.source === 'comment' && e.quote));
  const restricted = audience.limitations.some((text) => /reconnect|unavailable or restricted|could not be retrieved/i.test(text));
  const comments = metrics.find((m) => m.id === 'metric_comments')?.value;
  const hasFeedback = audience.sampledComments > 0;
  const headline = hasFeedback ? 'What people said about this post' : restricted ? 'Comment access needs attention' : comments === 0 ? 'Activity recorded, conversation still to build' : metrics.length ? 'Activity is available; comments are not yet included' : 'Audience feedback is not available yet';
  const summary = hasFeedback
    ? `${audience.sampledComments} comments and replies were reviewed. Findings describe this returned sample, not everyone who saw the post.`
    : restricted
      ? 'The platform feedback request was unavailable or restricted. Any counts below are from the last successful post sync; this does not mean nobody commented.'
      : comments === 0
        ? 'The last post sync recorded 0 comments, and no comment text was returned for this review. Activity counts alone cannot tell us what people liked or wanted to know.'
        : 'No comment text was returned for this review. We can show available activity, but cannot identify audience opinions or questions yet.';
  const questions = findings.some((f) => f.section === 'questions');
  const demand = findings.some((f) => f.section === 'demand');
  const actionTitle = restricted && !hasFeedback ? 'Restore access to feedback' : questions ? 'Start with the questions below' : demand ? 'Use the requests as a starting point' : hasFeedback ? 'Continue the conversation' : 'Invite a specific response';
  const action = restricted && !hasFeedback
    ? 'Check this platform in Connections and reconnect if prompted, then refresh audience feedback here.'
    : questions
      ? 'Read the cited questions and check the live conversation. Reply to any that are still unanswered; don’t assume a missing reply means you have not answered.'
      : demand
        ? 'Check the cited requests against content you have already published. If a request is still useful, consider answering it in a follow-up post.'
        : hasFeedback
          ? 'Reply to a specific comment and ask one follow-up question about the subject of this post. Refresh this section when more feedback arrives.'
          : 'Add one clear question about this post in a comment, such as “What would you like to know before trying this?” Treat this as a test, not a proven audience preference.';
  return { metrics, findings, headline, summary, actionTitle, action, hasFeedback, restricted, unparsedSignals: sources.filter((s) => !metrics.some((m) => m.id === s.id)) };
}
