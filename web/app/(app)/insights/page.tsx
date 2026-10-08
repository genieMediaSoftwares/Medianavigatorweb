import type { Metadata } from 'next';
import { OverviewView } from './OverviewView';

export const metadata: Metadata = { title: 'Insights' };

export default function InsightsOverviewPage() {
  return <OverviewView />;
}
