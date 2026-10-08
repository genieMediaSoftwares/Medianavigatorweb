import type { Metadata } from 'next';
import { AuditView } from './AuditView';

export const metadata: Metadata = { title: 'Admin · Audit log' };

export default function Page() {
  return <AuditView />;
}
