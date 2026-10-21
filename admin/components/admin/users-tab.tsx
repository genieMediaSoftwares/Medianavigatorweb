'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { dateShort, timeAgo } from '@/lib/format';
import { useMe } from '@/lib/hooks/useQueries';
import type { User, Role } from '@/types/api';
import { ROLES } from '../../../shared/admin';
import { infinite, PagedList, TableCard, td, th } from './shared';
import { UserLink } from './user-link';
import { useStepUp } from './step-up';

type Action = { user: User; kind: 'role' | 'status'; role?: Role };

export function UsersTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const me = useMe();
  const can = (permission: 'roles.manage' | 'users.suspend' | 'credits.adjust') => me.data?.user.permissions?.includes(permission) ?? false;
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [action, setAction] = useState<Action | null>(null);
  const [creditUser, setCreditUser] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState('10');
  const [creditReason, setCreditReason] = useState('');
  const stepUp = useStepUp();
  useEffect(() => { const t = setTimeout(() => setSearch(text.trim()), 350); return () => clearTimeout(t); }, [text]);
  const q = useInfiniteQuery({ queryKey: ['admin', 'users', search], ...infinite((cursor) => api.adminUsers({ cursor, search: search || undefined })) });

  const run = async () => {
    if (!action) return;
    const { user, kind } = action;
    try {
      if (kind === 'role' && action.role) await stepUp(() => api.adminSetRole(user.id, action.role!));
      else if (kind === 'status') await stepUp(() => api.adminSetStatus(user.id, user.status === 'active' ? 'disabled' : 'active'));
      await qc.invalidateQueries({ queryKey: ['admin'] });
      toast.success('Saved. This was recorded in the audit log.');
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'We couldn’t make that change.'); }
  };
  const label = !action ? null : action.kind === 'role'
    ? { title: 'Change staff access?', msg: `${action.user.email} will have the ${action.role?.replace(/_/g, ' ')} role. Permissions take effect immediately.`, btn: 'Change role' }
    : (action.user.status === 'active' ? { title: 'Disable this account?', msg: `${action.user.email} will be signed out and won’t be able to sign in.`, btn: 'Disable' } : { title: 'Enable this account?', msg: `${action.user.email} will be able to sign in again.`, btn: 'Enable' });

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
        <Input type="search" aria-label="Search users by email" placeholder="Search by email" className="pl-10" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <PagedList q={q} empty={search ? 'No users match that email' : 'No users yet'}>
        {(users) => (
          <TableCard>
            <table className="w-full min-w-[760px] border-collapse">
              <thead><tr><th className={th}>Email</th><th className={th}>Role</th><th className={th}>Status</th><th className={th}>Credits</th><th className={th}>Last sign-in</th><th className={th}>Joined</th><th className={`${th} text-right`}>Actions</th></tr></thead>
              <tbody>
                {users.map((u) => {
                  const self = me.data?.user.id === u.id;
                  return (
                    <tr key={u.id}>
                      <td className={`${td} max-w-[260px] truncate font-semibold text-ink`} title={u.email}><UserLink id={u.id} email={u.email} />{self && <span className="ml-2 text-xs font-medium text-subtle">(you)</span>}</td>
                      <td className={td}><Badge tone={u.role !== 'user' ? 'brand' : 'neutral'}>{u.role.replace(/_/g, ' ')}</Badge></td>
                      <td className={td}><Badge tone={u.status === 'active' ? 'good' : 'bad'} dot>{u.status === 'active' ? 'Active' : 'Disabled'}</Badge></td>
                      <td className={td}>{u.credits ?? 0}</td>
                      <td className={td}>{u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'Never'}</td>
                      <td className={td}>{dateShort(u.createdAt)}</td>
                      <td className={`${td} text-right`}>
                        {self ? <span className="text-subtle">No changes to yourself</span> : (
                          <span className="inline-flex gap-2">
                            {can('roles.manage') && <select aria-label={`Role for ${u.email}`} className="rounded-lg border border-line bg-surface px-2 py-1" value={u.role} onChange={(e) => setAction({ user: u, kind: 'role', role: e.target.value as Role })}>{ROLES.map((role) => <option key={role} value={role}>{role.replace(/_/g, ' ')}</option>)}</select>}
                            {can('users.suspend') && <Button size="sm" variant="secondary" onClick={() => setAction({ user: u, kind: 'status' })}>{u.status === 'active' ? 'Disable' : 'Enable'}</Button>}
                            {can('credits.adjust') && <Button size="sm" onClick={() => { setCreditUser(u); setCreditAmount('10'); setCreditReason(''); }}>Credits</Button>}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableCard>
        )}
      </PagedList>
      {creditUser && (
        <Modal open={creditUser !== null} onOpenChange={(o) => !o && setCreditUser(null)} title="Adjust Insight Credits" description={`Current balance: ${creditUser.credits ?? 0} credits`}>
          <div className="space-y-4">
            <div className="text-sm text-muted">{creditUser.email}</div>
            <Input type="number" min={-1000} max={1000} aria-label="Amount to add or remove" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="Amount to add or remove (-1000 to 1000)" />
            <Input aria-label="Reason for the adjustment" maxLength={200} value={creditReason} onChange={(e) => setCreditReason(e.target.value)} placeholder="Reason (recorded in the credit history and audit log)" />
            <p className="text-xs text-muted">Credit charging is not enabled, so this balance does not yet limit analyses.</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCreditUser(null)}>Cancel</Button>
              <Button onClick={async () => {
                const amount = Math.trunc(Number(creditAmount));
                if (!Number.isFinite(amount) || amount === 0) { toast.error('Enter a whole number.'); return; }
                const reason = creditReason.trim();
                if (reason && reason.length < 3) { toast.error('Give a reason of at least 3 characters, or leave it empty.'); return; }
                try { await stepUp(() => api.adminAdjustCredits(creditUser.id, amount, reason || undefined)); await qc.invalidateQueries({ queryKey: ['admin'] }); toast.success('Credits updated.'); setCreditUser(null); }
                catch (e) { toast.error(e instanceof ApiError ? e.message : 'We couldn’t adjust credits.'); }
              }}>Save</Button>
            </div>
          </div>
        </Modal>
      )}
      {label && <ConfirmDialog open={action !== null} onOpenChange={(o) => !o && setAction(null)} title={label.title} message={label.msg} confirmLabel={label.btn} danger={action?.kind === 'status' && action.user.status === 'active'} onConfirm={run} />}
    </div>
  );
}
