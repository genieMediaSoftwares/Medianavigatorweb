import { PlanTabs } from './PlanTabs';

export default function PlanLayout({ children }: LayoutProps<'/plan'>) {
  return (
    <>
      <PlanTabs />
      {children}
    </>
  );
}
