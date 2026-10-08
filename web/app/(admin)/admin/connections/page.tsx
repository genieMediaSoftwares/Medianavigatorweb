import type { Metadata } from 'next';
import { AccountsView } from './AccountsView';

export const metadata: Metadata = { title: 'Admin · Connected accounts' };

export default function Page() {
  return <AccountsView />;
}
