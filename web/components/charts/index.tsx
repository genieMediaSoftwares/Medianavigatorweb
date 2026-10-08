'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/States';

/** Charts are loaded only when a page actually shows one. */
const loading = () => <Skeleton className="size-full" />;

export const AreaTrend = dynamic(() => import('./RechartsImpl').then((m) => m.AreaTrend), { ssr: false, loading }) as typeof import('./RechartsImpl').AreaTrend;
export const Bars = dynamic(() => import('./RechartsImpl').then((m) => m.Bars), { ssr: false, loading }) as typeof import('./RechartsImpl').Bars;
export const Sparkline = dynamic(() => import('./RechartsImpl').then((m) => m.Sparkline), { ssr: false, loading }) as typeof import('./RechartsImpl').Sparkline;
export { ChartFrame } from './ChartFrame';
