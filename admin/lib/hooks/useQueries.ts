'use client';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import type { Permission } from '@/types/api';
export const useMe = () => useQuery({ queryKey: ['me'], queryFn: api.me, staleTime: 30_000 });
export function usePermission(permission: Permission) { return useMe().data?.user.permissions?.includes(permission) ?? false; }
export function shouldRetry(count: number, error: unknown): boolean {
  return count < 2 && error instanceof ApiError && (error.status === 0 || error.status >= 500);
}
