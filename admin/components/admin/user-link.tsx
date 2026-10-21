import Link from 'next/link';

export function UserLink({ id, email }: { id: string; email?: string | null }) {
  return <Link className="font-semibold text-brand-600 underline underline-offset-4 focus-visible:outline focus-visible:outline-2" href={`/admin/users/${encodeURIComponent(id)}`}>{email ?? `Customer ${id}`}</Link>;
}
