import type { Metadata } from 'next';
import { SyncRunsView } from './SyncRunsView';

export const metadata: Metadata = { title: 'Admin · Sync runs' };

export default function Page() {
  return <SyncRunsView />;
}
