'use client';
import { Select } from '@/components/ui/field';
export function PlatformFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="mb-5 max-w-xs"><Select aria-label="Filter by social platform" value={value} onChange={e => onChange(e.target.value)}><option value="">All platforms</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="youtube">YouTube</option><option value="linkedin">LinkedIn</option></Select></div>;
}
