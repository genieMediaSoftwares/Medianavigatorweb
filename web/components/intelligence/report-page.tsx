'use client';

import type { ReactNode } from 'react';
import { PageHeader } from '@/components/ui/page-header';

export function ReportPage({ title, subtitle, children, extra }: { title: string; subtitle: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="space-y-10">{children}{extra}</div>
    </>
  );
}
