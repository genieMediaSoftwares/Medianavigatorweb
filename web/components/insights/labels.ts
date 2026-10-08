import { typeLabel } from '@/lib/platforms';

/** "Reels", "Videos", "Regular posts": plural names for a sentence like "Reels get 5% engagement". */
export function pluralFormat(format: string): string {
  if (format === 'post') return 'Regular posts';
  return `${typeLabel(format)}s`;
}

/** Server text can contain words we avoid in the interface. Swap them for plain ones. */
export function plain(text: string): string {
  return text.replace(/channel baseline/gi, 'your usual').replace(/baseline/gi, 'your usual').replace(/\bmedian\b/gi, 'typical').replace(/\bdelta\b/gi, 'change');
}
