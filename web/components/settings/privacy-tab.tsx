'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, SectionHeader } from '@/components/ui/card';
import { Modal } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/field';
import { Notice } from '@/components/ui/states';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';

const STORE = [
  'Your account details: email, name, organization and time zone.',
  'The names and handles of the accounts you connect, and the public numbers the platforms share (views, likes, comments).',
  'Your access to those accounts, kept encrypted and deleted the moment you disconnect.',
  'Your notes and planned posts, and the devices you’re signed in on.',
];
const NEVER = [
  'Post, edit or delete anything on your social accounts. Media Navigator is read-only.',
  'Sell your data or share it with advertisers.',
  'Send your passwords or access keys to an AI provider.',
];

function List({ items, good }: { items: string[]; good: boolean }) {
  return (
    <ul className="space-y-3">
      {items.map((t) => (
        <li key={t} className="flex gap-3 text-[15px] text-text">
          <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${good ? 'bg-good-bg text-good' : 'bg-bad-bg text-bad'}`} aria-hidden="true">{good ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function DeleteAccount() {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = password.length > 0 && typed === 'DELETE';
  const close = (o: boolean) => { setOpen(o); if (!o) { setPassword(''); setTyped(''); setError(null); } };
  const submit = async () => {
    setBusy(true); setError(null);
    try {
      await api.deleteAccount(password);
      qc.clear();
      router.replace('/');
    } catch (e) {
      setError(e instanceof ApiError && (e.status === 401 || e.status === 403) ? 'That password isn’t right.' : e instanceof ApiError ? e.message : 'We couldn’t delete your account. Please try again.');
      setBusy(false);
    }
  };
  return (
    <Card className="border-bad/40">
      <SectionHeader title="Delete my account" description="This removes your account and everything we hold about you. It can’t be undone." />
      <Button variant="danger" onClick={() => setOpen(true)}>Delete my account</Button>
      <Modal open={open} onOpenChange={close} title="Delete your account?" description="Your connected accounts, saved numbers, notes and files are deleted for good.">
        <form onSubmit={(e) => { e.preventDefault(); if (ready) void submit(); }} className="space-y-4">
          <Field label="Your password">{(p) => <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} {...p} />}</Field>
          <Field label="Type DELETE to confirm">{(p) => <Input autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} {...p} />}</Field>
          {error && <Notice tone="bad">{error}</Notice>}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => close(false)}>Cancel</Button>
            <Button type="submit" variant="danger" loading={busy} disabled={!ready}>Delete my account</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}

export function PrivacyTab() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><SectionHeader title="What we store" /><List items={STORE} good /></Card>
        <Card><SectionHeader title="What we never do" /><List items={NEVER} good={false} /></Card>
      </div>
      <p className="text-sm text-muted">Read the full <Link href="/privacy" className="font-semibold text-brand-600 hover:underline">Privacy Policy</Link> and <Link href="/terms" className="font-semibold text-brand-600 hover:underline">Terms</Link>.</p>
      <DeleteAccount />
    </div>
  );
}
