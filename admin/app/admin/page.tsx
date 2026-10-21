import { Suspense } from 'react';
import { AdminView } from '@/components/admin/admin-view';
export default function Page() { return <Suspense fallback={<p>Loading administration…</p>}><AdminView /></Suspense>; }
