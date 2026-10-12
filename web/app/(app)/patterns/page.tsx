import { ReportPage } from '@/components/intelligence/report-page';
import { PatternsReport } from '@/components/intelligence/reports';
import { Patterns } from '@/components/insights/patterns';

export const metadata = { title: 'Pattern analysis · Media Navigator' };

export default function PatternsPage() {
  return <ReportPage title="Pattern analysis" subtitle="What your best and weakest posts have in common." extra={<section><h2 className="mb-4 text-xl">By format</h2><Patterns /></section>}><PatternsReport /></ReportPage>;
}
