import { useSyncExternalStore } from 'react';

/** Tracks whether the last API call reached the server, for the "We couldn't reach Media Navigator" banner. */
let reachable = true;
const listeners = new Set<() => void>();

export const reachability = {
  set(value: boolean) {
    if (value === reachable) return;
    reachable = value;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => reachable,
};

export const useReachable = () => useSyncExternalStore(reachability.subscribe, reachability.get, () => true);
