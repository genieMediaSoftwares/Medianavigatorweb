import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextField } from '@/components/ui/TextField';
import { colors } from '@/constants/colors';
import { PLATFORM_META } from '@/features/connections/platforms';
import { useApiResource } from '@/hooks/useApiResource';
import { formatRelativeTime } from '@/lib/format';
import type { Plan, PlanMatches } from '@/types/api';

import { fetchPlanMatches, publishPlan } from '../api';
import { formatDay, formatTime, utcToZoned } from '../dates';

function offsetText(minutes: number) {
  const abs = Math.abs(minutes);
  const amount = abs < 60 ? `${abs} min` : abs < 1440 ? `${Math.round(abs / 60)} h` : `${Math.round(abs / 1440)} d`;
  return minutes === 0 ? 'at the planned time' : `${amount} ${minutes > 0 ? 'after' : 'before'} the plan`;
}

const UNAVAILABLE: Record<NonNullable<PlanMatches['reason']>, string> = {
  not_connected: 'This platform isn’t connected, so Media Navigator can’t look for the published post.',
  format_not_synced: 'This platform doesn’t share this kind of post through its API, so it can’t be matched.',
  no_date: 'This plan has no date, so there’s nothing to match it against.',
  expired: 'The connection has expired, so recent posts may be missing. Reconnect to sync them.',
  permission_required: 'The connection is missing permissions, so recent posts may be missing.',
};

/**
 * Mark a plan published. Synced posts near the planned time are offered as possible matches; nothing is linked
 * until the user picks one. Without a match it is recorded as published manually (optionally with its link).
 */
export function PublishSheet({ plan, timezone, onDone, onClose }: { plan: Plan; timezone: string; onDone: (p: Plan) => void; onClose: () => void }) {
  const fetcher = useCallback(() => fetchPlanMatches(plan.id), [plan.id]);
  const { state, reload } = useApiResource(fetcher);
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const name = PLATFORM_META[plan.platform].name;

  const save = async (key: string, body: { mediaId?: string; url?: string }) => {
    setSaving(key);
    setError(null);
    try {
      onDone(await publishPlan(plan.id, body));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save.');
    } finally {
      setSaving(null);
    }
  };
  const m = state.status === 'success' ? state.data : null;
  const urlValid = !url.trim() || /^https?:\/\/\S+$/i.test(url.trim());

  return (
    <BottomSheet visible onClose={onClose} title="Mark published" closeLabel="Cancel">
      {error ? <Notice variant="error" message={error} /> : null}
      <Text className="mb-md text-label font-normal text-neutral-500">{`Is this ${name} post already live? Link it to the synced post so its results show here.`}</Text>

      {state.status === 'loading' ? (
        <View className="flex-row items-center py-md">
          <ActivityIndicator color={colors.primary} />
          <Text className="ml-sm text-label text-neutral-500">Looking for posts published around the planned time…</Text>
        </View>
      ) : !m ? (
        <Notice variant="warning" message="Couldn’t look for matching posts. You can still mark it published below." />
      ) : (
        <>
          {m.reason ? <Notice variant={m.state === 'unavailable' ? 'info' : 'warning'} message={UNAVAILABLE[m.reason]} /> : null}
          {m.candidates.length ? <Text className="mb-sm text-label font-semibold text-navy">Possible matches</Text> : null}
          {m.candidates.map((c) => {
            const local = utcToZoned(c.publishedAt, plan.timezone ?? timezone);
            return (
              <Pressable
                key={c.mediaId}
                onPress={() => void save(c.mediaId, { mediaId: c.mediaId })}
                disabled={saving !== null}
                accessibilityRole="button"
                accessibilityLabel={`Link ${c.title}, published ${formatDay(local.date)} ${formatTime(local.time)}`}
                className="mb-sm flex-row items-center rounded-xl border border-neutral-200 p-sm active:bg-sky"
              >
                {c.thumbnailUrl ? <Image source={{ uri: c.thumbnailUrl }} style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: colors.neutral100 }} contentFit="cover" /> : <View className="h-12 w-12 rounded-lg bg-neutral-100" />}
                <View className="ml-sm flex-1">
                  <Text className="text-label text-navy" numberOfLines={2}>{c.title}</Text>
                  <Text className="text-[12px] text-neutral-500">{`${formatDay(local.date)} ${formatTime(local.time)} · ${offsetText(c.minutesFromPlan)}`}</Text>
                </View>
                {saving === c.mediaId ? <ActivityIndicator color={colors.primary} /> : <Text className="text-label font-semibold text-primary">This one</Text>}
              </Pressable>
            );
          })}
          {m.state === 'none' ? (
            <Notice variant="info" message={`No synced ${name} post of this type was published around the planned time${m.lastSyncedAt ? ` (last synced ${formatRelativeTime(m.lastSyncedAt)})` : ''}. If you just posted, sync ${name} and check again.`} />
          ) : null}
          {m.state !== 'unavailable' ? <Button title="Check again" variant="ghost" size="sm" icon="refresh" onPress={reload} /> : null}
        </>
      )}

      <View className="mt-lg border-t border-neutral-100 pt-lg">
        <Text className="mb-sm text-label font-semibold text-navy">Not in the list?</Text>
        <TextField label="Link to the published post (optional)" value={url} onChangeText={setUrl} placeholder="https://" autoCapitalize="none" keyboardType="url" maxLength={1000}
          error={urlValid ? null : 'Use a full link starting with https://'}
          hint="If it matches a synced post exactly, it’s linked. Otherwise it’s recorded as published by you." />
        <Button title="Mark published" variant="secondary" onPress={() => void save('manual', url.trim() ? { url: url.trim() } : {})} loading={saving === 'manual'} disabled={saving !== null || !urlValid} />
      </View>
    </BottomSheet>
  );
}
