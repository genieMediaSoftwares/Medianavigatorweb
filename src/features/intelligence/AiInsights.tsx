import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Info, Send, Sparkles, Loader2, Lightbulb } from 'lucide-react';
import { useMedia } from '../../app/providers/MediaContext';
import { api, AiMeta } from '../../services/api';
import { AIInsight } from '../../types';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge, PageSkeleton } from '../../components/ui';

const SUGGESTIONS = [
  'Which format should I post more of?',
  'Why did my best post do so well?',
  'What should I change in my weakest posts?',
  'When is the best time to publish?',
];

type Answer = { answer: string; observedSignal: string; suggestedAction: string; source: string; ai: AiMeta };

const aiRan = (ai?: AiMeta) => ai?.status === 'ran' || ai?.status === 'cached';

export const AiInsights: React.FC = () => {
  const { connections, setCurrentTab } = useMedia();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<Answer | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const connected = connections.some((c) => c.connected);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    api.getIntelligence().then((r) => { setInsights(r.insights); setOpen(r.insights[0]?.id ?? null); }).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load, connections]);
  useEffect(() => { window.addEventListener('media-synced', load); return () => window.removeEventListener('media-synced', load); }, [load]);

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || asking) return;
    setQuestion(text); setAsking(true); setAskError(null); setResult(null);
    try { setResult(await api.askAI(text)); }
    catch (e) { setAskError((e as Error).message || 'Something went wrong. Please try again.'); }
    finally { setAsking(false); }
  };

  if (loading && insights.length === 0) return <PageSkeleton />;

  return (
    <div className="space-y-8 max-w-4xl">
      <section className="card p-6 md:p-8 relative overflow-hidden">
        <div aria-hidden="true" className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-brand-100/60 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-brand-700 font-semibold text-sm"><Sparkles className="w-4 h-4" />Ask Media Navigator</div>
          <h2 className="mt-2 font-display text-3xl font-medium tracking-tight">What do you want to know about your content?</h2>
          <form onSubmit={(e) => { e.preventDefault(); ask(question); }} className="mt-5 flex flex-col sm:flex-row gap-2">
            <input value={question} onChange={(e) => setQuestion(e.target.value)} disabled={!connected} className="input !h-12 flex-1" placeholder={connected ? 'e.g. Which of my posts should I turn into a series?' : 'Connect an account to ask questions'} aria-label="Your question" maxLength={500} />
            <button type="submit" disabled={!connected || asking || question.trim().length < 2} className="btn btn-primary !h-12 sm:px-6">{asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Ask</button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => <button key={s} disabled={!connected || asking} onClick={() => ask(s)} className="px-3 h-8 rounded-full text-sm font-medium border border-line-strong bg-white text-body hover:bg-canvas-soft hover:text-ink disabled:opacity-50">{s}</button>)}
          </div>

          {asking && <div className="mt-6 space-y-2" role="status" aria-label="Thinking"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-2/3" /></div>}
          {askError && <p role="alert" className="mt-5 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-900 p-3">{askError}</p>}
          {result && (
            <div className="mt-6 rounded-2xl bg-canvas border border-line p-5 animate-fade-up">
              <div className="flex items-center gap-2 mb-3">
                {aiRan(result.ai) ? <Badge tone="brand"><Sparkles className="w-3.5 h-3.5" />AI answer{result.ai.status === 'cached' ? ' (saved)' : ''}</Badge> : <Badge tone="neutral"><Info className="w-3.5 h-3.5" />Measured facts only</Badge>}
              </div>
              <p className="text-[15px] leading-relaxed text-ink whitespace-pre-line">{result.answer}</p>
              {!aiRan(result.ai) && <p className="mt-3 text-sm text-muted">AI interpretation isn’t available right now{result.ai.reason ? ` (${result.ai.reason})` : ''}, so this answer only restates numbers from your data.</p>}
              <dl className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl bg-white border border-line p-4"><dt className="eyebrow">What the data shows</dt><dd className="mt-1 text-sm text-ink">{result.observedSignal}</dd></div>
                <div className="rounded-xl bg-brand-50 border border-brand-100 p-4"><dt className="eyebrow !text-brand-700">Try next</dt><dd className="mt-1 text-sm text-ink">{result.suggestedAction}</dd></div>
              </dl>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-4">
          <div><h3 className="text-lg font-bold tracking-tight">Insights from your data</h3><p className="text-sm text-muted mt-0.5">Calculated automatically after each sync. These are rules applied to your numbers, not AI guesses.</p></div>
        </div>
        {error ? <EmptyState type="no_data" title="We couldn’t load insights" description={error} actionText="Try again" onAction={load} />
          : insights.length === 0 ? <EmptyState type={connected ? 'no_data' : 'no_connection'} title={connected ? 'Insights appear after your first sync' : 'Connect an account to see insights'} description={connected ? 'Once your posts have been imported, we’ll surface what stands out.' : undefined} actionText="Go to connections" onAction={() => setCurrentTab('connections')} />
          : (
            <ul className="space-y-3">
              {insights.map((i) => {
                const isOpen = open === i.id;
                return (
                  <li key={i.id} className="card overflow-hidden">
                    <button onClick={() => setOpen(isOpen ? null : i.id)} aria-expanded={isOpen} className="w-full text-left p-5 flex items-start gap-4">
                      <span className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-lg shrink-0" aria-hidden="true">{i.icon}</span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2 flex-wrap"><Badge tone="brand">{i.category}</Badge><span className="text-xs text-muted">{i.confidence} confidence · {i.detectedAt}</span></span>
                        <span className="block mt-2 font-bold text-ink leading-snug">{i.title}</span>
                        <span className="block mt-1 text-sm text-body">{i.description}</span>
                      </span>
                      <ChevronDown className={`w-5 h-5 text-muted shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-0 pl-[76px] -mt-1 space-y-4 animate-fade-up">
                        <p className="text-sm text-body"><span className="font-semibold text-ink">Why it matters. </span>{i.whyItMatters}</p>
                        {i.recommendedAction && (
                          <div className="rounded-xl bg-brand-50 border border-brand-100 p-4 flex gap-3">
                            <Lightbulb className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-ink"><span className="font-semibold">Try this. </span>{i.recommendedAction}</p>
                          </div>
                        )}
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {i.supportingData && <div><dt className="eyebrow">Evidence</dt><dd className="mt-1 text-body">{i.supportingData}</dd></div>}
                          {i.possibleReason && <div><dt className="eyebrow">Possible reason</dt><dd className="mt-1 text-body italic">{i.possibleReason}</dd></div>}
                          {i.measurement && <div className="md:col-span-2"><dt className="eyebrow">How to measure the result</dt><dd className="mt-1 text-body">{i.measurement}</dd></div>}
                        </dl>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
      </section>
    </div>
  );
};
