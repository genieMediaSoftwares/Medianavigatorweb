import { PageHeader } from '@/components/ui/Card';
import { SettingsTabs } from './SettingsTabs';

export default function SettingsLayout({ children }: LayoutProps<'/settings'>) {
  return (
    <>
      <PageHeader title="Settings" />
      <SettingsTabs />
      {children}
    </>
  );
}
