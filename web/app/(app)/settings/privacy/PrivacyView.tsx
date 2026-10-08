'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { usersApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { READ_ONLY_NOTE } from '@/lib/copy';
import { useSessionNavigate } from '@/lib/hooks';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { PasswordField, TextField } from '@/components/ui/Field';
import { FormError } from '@/components/ui/States';

const CONFIRM_WORD = 'DELETE';

export function PrivacyView() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');
  const go = useSessionNavigate();
  const del = useMutation({
    mutationFn: () => usersApi.deleteAccount(password),
    onSuccess: () => go('/'),
  });
  const ready = password.length > 0 && typed === CONFIRM_WORD;
  const message = del.error instanceof ApiError && del.error.status === 401 ? 'That password is incorrect.' : del.error;

  return (
    <div className="grid max-w-3xl gap-6">
      <Card>
        <CardHeader title="What we store" />
        <ul className="list-disc space-y-1.5 pl-5 text-ink-muted">
          <li>Your account details: email, name, organization, account type and time zone.</li>
          <li>For each connected channel: its name, follower and post counts, and your posts&apos; titles, captions, dates and results.</li>
          <li>Daily totals, so we can show your results over time.</li>
          <li>Encrypted access to your channels. {READ_ONLY_NOTE}</li>
          <li>Your plans, notifications and any files you upload.</li>
        </ul>
        <p className="mt-3 text-[15px] text-ink-muted">
          Read the full <Link href="/privacy" className="font-semibold text-action underline">Privacy page</Link> for what is sent to the AI provider and your rights.
        </p>
      </Card>

      <Card className="border-bad-fg/30">
        <CardHeader title="Delete my account" description="This removes your connections, imported posts, results, plans, notifications and files. It can't be undone." />
        <Button variant="danger" onClick={() => setOpen(true)}>Delete my account</Button>
      </Card>

      <ConfirmDialog
        open={open}
        onOpenChange={(o) => { setOpen(o); if (!o) { setPassword(''); setTyped(''); del.reset(); } }}
        title="Delete your account?"
        consequence="Everything we hold for you will be deleted and you'll be signed out on every device."
        confirmLabel="Delete my account"
        onConfirm={() => ready && del.mutate()}
        pending={del.isPending}
        confirmDisabled={!ready}
      >
        <div className="space-y-3">
          {del.isError ? <FormError error={message} /> : null}
          <PasswordField label="Your password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <TextField label={`Type ${CONFIRM_WORD} to confirm`} autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
          {!ready ? <p className="text-sm text-ink-subtle">Enter your password and type {CONFIRM_WORD} to enable deletion.</p> : null}
        </div>
      </ConfirmDialog>
    </div>
  );
}
