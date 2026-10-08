'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { intelligenceApi } from '@/lib/api/endpoints';
import { useServiceStatus } from '@/lib/hooks';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { AiStatusNote, Layer, aiRan } from '@/components/ui/Layers';
import { FormError } from '@/components/ui/States';

const EXAMPLES = [
  'What kind of post works best for me?',
  'Why did my best post do so well?',
  'When should I post next?',
  'What should I stop doing?',
];

export function AskView() {
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const status = useServiceStatus();
  const ask = useMutation({ mutationFn: intelligenceApi.ask });
  const aiOff = status.data ? !status.data.ai.available : false;

  const submit = (q: string) => {
    const text = q.trim();
    if (text.length < 2) {
      setError('Type a question first');
      return;
    }
    if (text.length > 500) {
      setError('Keep your question under 500 characters');
      return;
    }
    setError('');
    ask.mutate(text);
  };

  return (
    <>
      <PageHeader title="Ask about your content" description="Ask in your own words. Answers are based only on your imported posts." />
      {aiOff ? (
        <p className="mb-4 rounded-xl bg-neutral-bg px-4 py-3 text-[15px] text-neutral-fg" role="note">
          AI explanations aren&apos;t set up on this server, so answers will list the measured facts only.
        </p>
      ) : null}
      <Card>
        <form onSubmit={(e) => { e.preventDefault(); submit(question); }} noValidate>
          <label htmlFor="ask" className="block font-semibold">Your question</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="ask"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={500}
              disabled={ask.isPending}
              placeholder="e.g. What kind of post works best for me?"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'ask-error' : undefined}
              className="min-h-11 flex-1 rounded-[var(--radius-control)] border border-line-strong bg-surface px-3.5 text-[16px] text-ink"
            />
            <Button type="submit" loading={ask.isPending} icon={<Send className="size-4" aria-hidden />}>Ask</Button>
          </div>
          {error ? <p id="ask-error" className="mt-1.5 text-sm text-bad-fg">{error}</p> : null}
        </form>
        <div className="mt-4">
          <p className="text-sm font-semibold text-ink-muted">Try one of these</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <li key={ex}>
                <button
                  type="button"
                  disabled={ask.isPending}
                  onClick={() => { setQuestion(ex); submit(ex); }}
                  className="min-h-11 rounded-full border border-line-strong bg-surface px-4 text-[15px] hover:bg-surface-2 disabled:opacity-60"
                >
                  {ex}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <div className="mt-6 space-y-4" aria-live="polite">
        {ask.isError ? <FormError error={ask.error} /> : null}
        {ask.data ? (
          <>
            <AiStatusNote ai={ask.data.ai} />
            <Layer kind="measured"><p className="text-ink-muted">{ask.data.observedSignal}</p></Layer>
            {aiRan(ask.data.ai) ? <Layer kind="meaning"><p className="whitespace-pre-line text-ink">{ask.data.answer}</p></Layer> : (
              <Layer kind="calculated"><p className="text-ink-muted">{ask.data.answer}</p></Layer>
            )}
            <Card className="bg-tint">
              <h3 className="font-semibold">What to try</h3>
              <p className="mt-1 text-ink-muted">{ask.data.suggestedAction}</p>
            </Card>
          </>
        ) : null}
      </div>
    </>
  );
}
