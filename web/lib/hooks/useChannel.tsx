'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Platform } from '@/types/api';

type Channel = Platform | 'all';
const Ctx = createContext<{ channel: Channel; setChannel: (c: Channel) => void; days: number; setDays: (d: number) => void } | null>(null);

/** The channel and date-range choices in the top bar. Pages that can be filtered read it from here. */
export function ChannelProvider({ children }: { children: ReactNode }) {
  const [channel, setChannel] = useState<Channel>('all');
  const [days, setDays] = useState(30);
  const value = useMemo(() => ({ channel, setChannel, days, setDays }), [channel, days]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChannel() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useChannel must be used inside <ChannelProvider>');
  return v;
}
