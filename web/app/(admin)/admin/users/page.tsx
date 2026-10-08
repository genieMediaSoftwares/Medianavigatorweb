import type { Metadata } from 'next';
import { UsersView } from './UsersView';

export const metadata: Metadata = { title: 'Admin · Users' };

export default function Page() {
  return <UsersView />;
}
