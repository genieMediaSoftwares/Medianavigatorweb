'use client';

import { useMutation } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Textarea } from '@/components/ui/field';
import { Notice } from '@/components/ui/states';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { useIntelStatus } from '@/lib/hooks/useQueries';
import type { AskResult } from '@/types/api';

const EXAMPLES = ['What should I post next?', 'Which format works best for me?', 'When should I post?'];

export function Ask() {
  const [question, setQuestion] = useState('');
  const status = useIntelStatus();
  const ask = useMutation<AskResult, ApiError, string>({ mutationFn: (q) => api.ask(q) });
  const trimmed = question.trim();
  const aiHelped = ask.data ? ask.data.ai.status === 'ran' || ask.data.ai.status === 'cached' : false;
  const submit = () => { if (trimmed.length >= 2 && !ask.isPending) ask.mutate(trimmed); };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {status.data && !status.data.ai.available && (
        <Notice tone="info">AI explanation isn’t available right now. You can still ask, and we’ll answer from the numbers we measured.</Notice>
      )}
      <Card>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
          <Field label="Ask about your content" hint="For example: which format works best for me?">
            {(p) => <Textarea {...p} value={question} maxLength={500} rows={3} onChange={(e) => setQuestion(e.target.value)} placeholder="Type your question here" />}
          </Field>
          <div className="flex flex-wrap gap-2" aria-label="Example questions" role="group">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => setQuestion(ex)} className="min-h-10 rounded-full border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:border-brand-200 hover:bg-brand-50">{ex}</button>
            ))}
          </div>
          <div className="flex justify-end"><Button type="submit" loading={ask.isPending} disabled={trimmed.length < 2}>Ask</Button></div>
        </form>
      </Card>

      {ask.isError && (
        <Notice tone="bad">{ask.error.status === 429 ? 'Too many requests. Please try again in a moment.' : ask.error.message}</Notice>
      )}

      {ask.data && (
        <div className="space-y-4" aria-live="polite">
          <div className="flex items-center gap-2">
            <Badge tone={aiHelped ? 'brand' : 'neutral'}><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />{aiHelped ? 'Explained with AI' : 'Based on your numbers (no AI)'}</Badge>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="p-5">
              <h3 className="text-lg">What we saw</h3>
              <p className="mt-2 text-[15px] text-text">{ask.data.answer}</p>
              {ask.data.observedSignal && <p className="mt-2 text-sm text-muted">{ask.data.observedSignal}</p>}
            </Card>
            <Card className="p-5">
              <h3 className="text-lg">What to try</h3>
              <p className="mt-2 text-[15px] text-text">{ask.data.suggestedAction}</p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
