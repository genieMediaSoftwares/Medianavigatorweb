'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { dateShort, timeAgo } from '@/lib/format';
import { useMe } from '@/lib/hooks/useQueries';
import type { User } from '@/types/api';
import { infinite, PagedList, TableCard, td, th } from './shared';

type Action = { user: User; kind: 'role' | 'status' };

export function UsersTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const me = useMe();
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [action, setAction] = useState<Action | null>(null);
  useEffect(() => { const t = setTimeout(() => setSearch(text.trim()), 350); return () => clearTimeout(t); }, [text]);
  const q = useInfiniteQuery({ queryKey: ['admin', 'users', search], ...infinite((cursor) => api.adminUsers({ cursor, search: search || undefined })) });

  const run = async () => {
    if (!action) return;
    const { user, kind } = action;
    try {
      if (kind === 'role') await api.adminSetRole(user.id, user.role === 'admin' ? 'user' : 'admin');
      else await api.adminSetStatus(user.id, user.status === 'active' ? 'disabled' : 'active');
      await qc.invalidateQueries({ queryKey: ['admin'] });
      toast.success('Saved. This was recorded in the audit log.');
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'We couldn’t make that change.'); }
  };
  const label = !action ? null : action.kind === 'role'
    ? (action.user.role === 'admin' ? { title: 'Remove admin access?', msg: `${action.user.email} will no longer be able to open the admin console.`, btn: 'Remove admin' } : { title: 'Make this person an admin?', msg: `${action.user.email} will be able to see all users and accounts in the admin console.`, btn: 'Make admin' })
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
              <thead><tr><th className={th}>Email</th><th className={th}>Role</th><th className={th}>Status</th><th className={th}>Last sign-in</th><th className={th}>Joined</th><th className={`${th} text-right`}>Actions</th></tr></thead>
              <tbody>
                {users.map((u) => {
                  const self = me.data?.user.id === u.id;
                  return (
                    <tr key={u.id}>
                      <td className={`${td} max-w-[260px] truncate font-semibold text-ink`} title={u.email}>{u.email}{self && <span className="ml-2 text-xs font-medium text-subtle">(you)</span>}</td>
                      <td className={td}><Badge tone={u.role === 'admin' ? 'brand' : 'neutral'}>{u.role === 'admin' ? 'Admin' : 'User'}</Badge></td>
                      <td className={td}><Badge tone={u.status === 'active' ? 'good' : 'bad'} dot>{u.status === 'active' ? 'Active' : 'Disabled'}</Badge></td>
                      <td className={td}>{u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'Never'}</td>
                      <td className={td}>{dateShort(u.createdAt)}</td>
                      <td className={`${td} text-right`}>
                        {self ? <span className="text-subtle">No changes to yourself</span> : (
                          <span className="inline-flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => setAction({ user: u, kind: 'role' })}>{u.role === 'admin' ? 'Remove admin' : 'Make admin'}</Button>
                            <Button size="sm" variant="secondary" onClick={() => setAction({ user: u, kind: 'status' })}>{u.status === 'active' ? 'Disable' : 'Enable'}</Button>
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
      {label && <ConfirmDialog open={action !== null} onOpenChange={(o) => !o && setAction(null)} title={label.title} message={label.msg} confirmLabel={label.btn} danger={action?.kind === 'status' && action.user.status === 'active'} onConfirm={run} />}
    </div>
  );
}
