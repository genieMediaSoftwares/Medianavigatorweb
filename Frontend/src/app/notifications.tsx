import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { colors } from '@/constants/colors';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '@/features/notifications/api';
import { formatRelativeTime } from '@/lib/format';
import type { NotificationItem } from '@/types/api';

type ListState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' };

const SEVERITY_COLOR: Record<string, string> = { high: colors.danger, medium: colors.warning };

export default function NotificationsScreen() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<ListState>({ status: 'loading' });
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  // First page; `reloadKey` re-runs it for retry, pull-to-refresh and after "mark all read".
  useEffect(() => {
    let current = true;
    fetchNotifications().then(
      (page) => {
        if (!current) return;
        setItems(page.items);
        setCursor(page.nextCursor);
        setState({ status: 'ready' });
      },
      (e: unknown) => {
        if (current) setState({ status: 'error', message: e instanceof Error ? e.message : 'Unable to load notifications.' });
      },
    );
    return () => {
      current = false;
    };
  }, [reloadKey]);

  const loadFirst = () => {
    setState({ status: 'loading' });
    setReloadKey((k) => k + 1);
  };

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchNotifications(cursor);
      setItems((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Unable to load more.');
    } finally {
      setLoadingMore(false);
    }
  };

  const markRead = async (item: NotificationItem) => {
    if (item.read) return;
    setActionError(null);
    try {
      await markNotificationRead(item.id);
      setItems((current) => current.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Unable to mark as read.');
    }
  };

  const markAll = async () => {
    setMarkingAll(true);
    setActionError(null);
    try {
      await markAllNotificationsRead();
      setReloadKey((k) => k + 1);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Unable to mark all as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <FlatList
      className="flex-1 bg-white"
      contentContainerClassName="px-xl pb-3xl pt-md"
      data={state.status === 'ready' ? items : []}
      keyExtractor={(item) => item.id}
      refreshing={false}
      onRefresh={loadFirst}
      onEndReached={() => void loadMore()}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        <>
          {actionError ? <Notice variant="error" message={actionError} /> : null}
          {state.status === 'ready' && items.some((n) => !n.read) ? (
            <View className="mb-md items-end">
              <Button title="Mark all read" size="sm" variant="ghost" onPress={() => void markAll()} loading={markingAll} />
            </View>
          ) : null}
        </>
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => void markRead(item)} accessibilityRole="button" className="flex-row border-b border-neutral-100 py-md active:opacity-70">
          <View className="mr-md mt-sm h-2 w-2 rounded-full" style={{ backgroundColor: item.read ? 'transparent' : (SEVERITY_COLOR[item.severity] ?? colors.primary) }} />
          <View className="flex-1">
            <Text className={`text-label ${item.read ? 'font-normal text-neutral-500' : 'font-semibold text-navy'}`}>{item.title}</Text>
            {item.description || item.body ? <Text className="mt-0.5 text-label font-normal text-neutral-500">{item.description ?? item.body}</Text> : null}
            <Text className="mt-0.5 text-caption text-neutral-400">{formatRelativeTime(item.createdAt ?? item.timestamp ?? null)}</Text>
          </View>
        </Pressable>
      )}
      ListEmptyComponent={
        state.status === 'loading' ? (
          <LoadingState message="Loading notifications…" />
        ) : state.status === 'error' ? (
          <ErrorState message={state.message} onRetry={loadFirst} />
        ) : (
          <EmptyState icon="notifications-outline" title="You’re all caught up" message="Sync results and connection issues will show up here." />
        )
      }
      ListFooterComponent={loadingMore ? <ActivityIndicator className="my-lg" color={colors.primary} /> : null}
    />
  );
}
