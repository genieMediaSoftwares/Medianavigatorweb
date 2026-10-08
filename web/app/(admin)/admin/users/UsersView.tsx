'use client';

import { useDeferredValue, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/endpoints';
import { qk } from '@/lib/query-keys';
import { formatDate, timeAgo } from '@/lib/format';
import { useMe } from '@/lib/hooks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { errorMessage } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { AdminTable, PAGE_SIZE, usePaged } from '../AdminTable';
import type { User } from '@/types/api';

type Action = { user: User; kind: 'role' | 'status' };

export function UsersView() {
  const me = useMe();
  const client = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const term = useDeferredValue(search.trim());
  const [action, setAction] = useState<Action | null>(null);
  const users = usePaged(qk.admin.users(term), (cursor) => adminApi.users({ cursor, limit: PAGE_SIZE, search: term || undefined }));

  const apply = useMutation({
    mutationFn: ({ user, kind }: Action) =>
      kind === 'role' ? adminApi.setRole(user.id, user.role === 'admin' ? 'user' : 'admin') : adminApi.setStatus(user.id, user.status === 'active' ? 'disabled' : 'active'),
    onSuccess: () => {
      setAction(null);
      void client.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast('Saved. This change is in the audit log.');
    },
    onError: (e) => toast(errorMessage(e), 'error'),
  });

  const describe = (a: Action) => {
    if (a.kind === 'role') return a.user.role === 'admin'
      ? { title: `Remove admin from ${a.user.email}?`, consequence: 'They will lose access to the admin console immediately.', label: 'Remove admin' }
      : { title: `Make ${a.user.email} an admin?`, consequence: 'They will be able to see every user and change roles and access.', label: 'Make admin' };
    return a.user.status === 'active'
      ? { title: `Disable ${a.user.email}?`, consequence: 'They will be signed out everywhere and unable to sign in until re-enabled.', label: 'Disable account' }
      : { title: `Enable ${a.user.email}?`, consequence: 'They will be able to sign in again.', label: 'Enable account' };
  };
  const d = action ? describe(action) : null;

  return (
    <>
      <label className="mb-4 flex max-w-md flex-col gap-1 text-sm font-semibold text-ink-muted">
        Search by email
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} className="min-h-11 rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 text-[16px] font-normal text-ink" />
      </label>
      <AdminTable
        query={users}
        caption="Users"
        empty={term ? 'No users match that search.' : 'No users yet.'}
        rowKey={(u) => u.id}
        columns={[
          { label: 'Email', cell: (u) => <span className="font-semibold">{u.email}</span> },
          { label: 'Role', cell: (u) => <Badge tone={u.role === 'admin' ? 'info' : 'neutral'}>{u.role === 'admin' ? 'Admin' : 'User'}</Badge> },
          { label: 'Status', cell: (u) => <Badge tone={u.status === 'active' ? 'good' : 'bad'}>{u.status === 'active' ? 'Active' : 'Disabled'}</Badge> },
          { label: 'Joined', cell: (u) => formatDate(u.createdAt) },
          { label: 'Last sign-in', cell: (u) => timeAgo(u.lastLoginAt) ?? 'Never' },
          {
            label: 'Actions',
            cell: (u) => u.id === me.data?.user.id ? <span className="text-sm text-ink-subtle">That&apos;s you</span> : (
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="ghost" onClick={() => setAction({ user: u, kind: 'role' })}>{u.role === 'admin' ? 'Remove admin' : 'Make admin'}</Button>
                <Button size="sm" variant="ghost" onClick={() => setAction({ user: u, kind: 'status' })}>{u.status === 'active' ? 'Disable' : 'Enable'}</Button>
              </div>
            ),
          },
        ]}
      />
      <ConfirmDialog
        open={action !== null}
        onOpenChange={(o) => !o && setAction(null)}
        title={d?.title ?? ''}
        consequence={d?.consequence ?? ''}
        confirmLabel={d?.label ?? ''}
        onConfirm={() => action && apply.mutate(action)}
        pending={apply.isPending}
      />
    </>
  );
}
