import { InsightsTabs } from './InsightsTabs';

export default function InsightsLayout({ children }: LayoutProps<'/insights'>) {
  return (
    <>
      <InsightsTabs />
      {children}
    </>
  );
}
