import { ReportPage } from '@/components/intelligence/report-page';
import { StrategyReport } from '@/components/intelligence/reports';
import { BestTimesView } from '@/components/insights/best-times-view';

export const metadata = { title: 'Posting strategy · Media Navigator' };

export default function StrategyPage() {
  return <ReportPage title="Posting strategy" subtitle="How often, when and in which format to post, based on your own history." extra={<section><h2 className="mb-4 text-xl">Your best times</h2><BestTimesView embedded /></section>}><StrategyReport /></ReportPage>;
}
