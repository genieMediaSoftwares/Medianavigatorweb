'use client';
import Link from 'next/link';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { usePermission } from '@/lib/hooks/useQueries';
import { AudienceCell, CoverageCell, LastAttemptCell } from './coverage';
import { UserLink } from './user-link';
import { useStepUp } from './step-up';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { dateTime } from '@/lib/format';
import { platformName } from '@/lib/platforms';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, SectionHeader } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { infinite, PagedList, statusLabel, statusTone, TableCard, td, th } from './shared';

/** Admin adjustments recorded since the ledger was introduced. Charging is not enabled, so there are no spends. */
function CreditHistory({ id }: { id: string }) {
  const q = useInfiniteQuery({ queryKey: ['admin', 'user', id, 'credit-ledger'], ...infinite((cursor) => api.adminCreditLedger(id, { cursor })) });
  return <section><SectionHeader title="Credit adjustments" description="Recorded since the credit ledger was introduced. Credit charging is not enabled, so analyses do not appear here." />
    <PagedList q={q} empty="No credit adjustments recorded">
      {(rows) => <TableCard><table className="w-full min-w-[720px]"><thead><tr>{['When', 'Change', 'Balance after', 'Reason', 'By'].map((title) => <th key={title} className={th}>{title}</th>)}</tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td className={td}>{dateTime(r.createdAt)}</td><td className={`${td} tabular font-semibold`}>{r.delta > 0 ? `+${r.delta}` : r.delta}</td><td className={`${td} tabular`}>{r.balanceAfter}</td><td className={td}>{r.reason ?? 'No reason given'}</td><td className={td}>{r.actorId ? <UserLink id={r.actorId} email={r.actorEmail} /> : 'System'}</td></tr>)}</tbody></table></TableCard>}
    </PagedList>
  </section>;
}

export function UserDetail({ id }: { id: string }) {
  const q = useQuery({ queryKey: ['admin', 'user', id], queryFn: () => api.adminUser(id), retry: false, refetchOnWindowFocus: false });
  const canViewCredits = usePermission('credits.view');
  const canResetMfa = usePermission('roles.manage');
  const stepUp = useStepUp();
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  return <div className="space-y-6">
    <Link className="text-brand-600 underline" href="/admin?tab=users">Back to customers</Link>
    <PageHeader title="Customer detail" subtitle="Shared account information for the website and mobile app." />
    {q.isPending && <p role="status">Loading customer…</p>}
    {q.isError && <ErrorState error={q.error} onRetry={() => void q.refetch()} />}
    {q.isSuccess && <>
      <Card><SectionHeader title={q.data.user.email} description={q.data.profile?.fullName ?? 'No profile name'} />
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries({ Role: q.data.user.role, Status: q.data.user.status, Organization: q.data.profile?.organization ?? 'Not provided', Timezone: q.data.profile?.timezone ?? 'Not set', Joined: dateTime(q.data.user.createdAt), 'Last sign-in': q.data.user.lastLoginAt ? dateTime(q.data.user.lastLoginAt) : 'Never', 'Active sessions': q.data.activeSessions, 'Locked until': q.data.lockedUntil ? dateTime(q.data.lockedUntil) : 'No lock recorded', 'Failed login attempts': q.data.failedLoginCount, 'Insight Credits': q.data.user.credits, 'Two-step sign-in': q.data.user.mfaEnabled ? 'On' : 'Off' }).map(([label, value]) => <div key={label}><dt className="text-muted">{label}</dt><dd className="break-words font-semibold">{value}</dd></div>)}
        </dl>
        {canResetMfa && q.data.user.mfaEnabled && <div className="mt-5 border-t border-line pt-5"><Button variant="secondary" onClick={() => setConfirmReset(true)}>Reset two-step sign-in</Button><p className="mt-2 text-sm text-muted">For a staff member who lost their authenticator and recovery codes. Signs them out everywhere.</p></div>}
      </Card>
      <ConfirmDialog open={confirmReset} onOpenChange={setConfirmReset} title="Reset two-step sign-in?" message={`${q.data.user.email} will be signed out everywhere and must set up two-step sign-in again. This is recorded in the audit log.`} confirmLabel="Reset" danger onConfirm={async () => { try { await stepUp(() => api.adminResetMfa(id)); toast.success('Two-step sign-in was reset.'); await q.refetch(); } catch (e) { toast.error(e instanceof ApiError ? e.message : 'We couldn’t reset it.'); } }} />
      <section><SectionHeader title="Social connections" description="Provider credentials are excluded from this view." />
        {q.data.connections.length === 0 ? <EmptyState title="No social connections" /> : <TableCard><table className="w-full min-w-[1100px]"><thead><tr>{['Platform', 'Handle', 'Status', 'Posts', 'Audience', 'Last success', 'Last attempt', 'Authentication', 'Credential expiry', 'Missing permissions'].map((title) => <th key={title} className={th}>{title}</th>)}</tr></thead><tbody>{q.data.connections.map((c) => <tr key={c.id}><td className={td}>{platformName(c.platform)}</td><td className={td}>{c.handle}</td><td className={td}><Badge tone={statusTone(c.status)}>{statusLabel(c.status)}</Badge></td><td className={td}><CoverageCell c={c} /></td><td className={td}><AudienceCell c={c} /></td><td className={td}>{c.lastSyncedAt ? dateTime(c.lastSyncedAt) : 'Never'}</td><td className={td}><LastAttemptCell c={c} /></td><td className={td}>{c.authMethod ?? 'Unknown'}</td><td className={td}>{c.credentialsExpiresAt ? dateTime(c.credentialsExpiresAt) : 'Not supplied'}</td><td className={td}>{c.missingPermissions.join(', ') || 'None reported'}</td></tr>)}</tbody></table></TableCard>}
      </section>
      {canViewCredits && <CreditHistory id={id} />}
    </>}
  </div>;
}
