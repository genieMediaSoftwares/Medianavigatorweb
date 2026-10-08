import type { Metadata } from 'next';
import { BestTimesView } from './BestTimesView';

export const metadata: Metadata = { title: 'Best times' };

export default function BestTimesPage() {
  return <BestTimesView />;
}
