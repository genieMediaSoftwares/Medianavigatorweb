'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { PageSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { TabBar } from '@/components/ui/tabs';
import { useMe } from '@/lib/hooks/useQueries';
import { FilesTab } from './files-tab';
import { PrivacyTab } from './privacy-tab';
import { ProfileTab } from './profile-tab';
import { SecurityTab } from './security-tab';

const TABS = [{ id: 'profile', label: 'Profile' }, { id: 'security', label: 'Security' }, { id: 'files', label: 'Files' }, { id: 'privacy', label: 'Privacy' }];

export function SettingsView() {
  const router = useRouter();
  const params = useSearchParams();
  const me = useMe();
  const raw = params.get('tab') ?? 'profile';
  const tab = TABS.some((t) => t.id === raw) ? raw : 'profile';
  return (
    <>
      <PageHeader title="Settings" subtitle="Your profile, security, files and privacy." />
      <div className="space-y-6">
        <TabBar tabs={TABS} value={tab} onChange={(id) => router.replace(`/settings?tab=${id}`, { scroll: false })} label="Settings sections" />
        <div role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === 'profile' && (me.isLoading ? <PageSkeleton /> : me.isError ? <ErrorState error={me.error} onRetry={() => void me.refetch()} /> : me.data ? <ProfileTab me={me.data} /> : null)}
          {tab === 'security' && <SecurityTab />}
          {tab === 'files' && <FilesTab />}
          {tab === 'privacy' && <PrivacyTab />}
        </div>
      </div>
    </>
  );
}
