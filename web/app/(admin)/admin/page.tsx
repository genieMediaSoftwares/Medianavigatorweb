import type { Metadata } from 'next';
import { SystemView } from './SystemView';

export const metadata: Metadata = { title: 'Admin · System' };

export default function AdminSystemPage() {
  return <SystemView />;
}
