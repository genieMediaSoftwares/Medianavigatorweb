import { getSecureItem, SecureStorageKey, setSecureItem } from '@/lib/storage/secure-storage';

// Preserve tap order even when the device storage is slower than repeated shuffle taps.
let writing = Promise.resolve();
export async function readIdea(): Promise<string | null> {
  await writing.catch(() => undefined);
  return getSecureItem(SecureStorageKey.DailyIdea);
}

export function rememberIdea(day: string, userId: string, index: number): void {
  writing = writing.catch(() => undefined).then(() => setSecureItem(SecureStorageKey.DailyIdea, JSON.stringify({ day, userId, index })));
  void writing.catch(() => undefined);
}
