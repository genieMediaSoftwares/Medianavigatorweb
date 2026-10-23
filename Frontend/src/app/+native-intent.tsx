import { guardNativeIntent } from '@/lib/navigation/native-intent';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return guardNativeIntent(path);
}
