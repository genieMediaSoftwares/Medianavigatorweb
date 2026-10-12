import { ReportPage } from '@/components/intelligence/report-page';
import { TrendsReport } from '@/components/intelligence/reports';
import { Trends } from '@/components/insights/trends';

export const metadata = { title: 'Trends & ideas · Media Navigator' };

export default function TrendsPage() {
  return <ReportPage title="Trends & ideas" subtitle="What is changing in your results, and post ideas built from them." extra={<section><h2 className="mb-4 text-xl">Measured trends</h2><Trends /></section>}><TrendsReport /></ReportPage>;
}
