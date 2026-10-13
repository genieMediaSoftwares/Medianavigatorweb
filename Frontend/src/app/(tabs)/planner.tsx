import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Card, KeyValue } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { PlatformLogo } from '@/components/PlatformLogo';
import { TabScreen } from '@/components/TabScreen';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Notice } from '@/components/ui/Notice';
import { TextField } from '@/components/ui/TextField';
import { colors } from '@/constants/colors';
import { PLATFORM_META, PLATFORM_ORDER } from '@/features/connections/platforms';
import { addPlannedItem, fetchPlannedItems, fetchPlannerInsights, removePlannedItem } from '@/features/planner/api';
import { normaliseTime } from '@/features/planner/time';
import { useApiResource } from '@/hooks/useApiResource';
import { DAY_NAMES, formatPercent } from '@/lib/format';
import type { PlannedItem, PlannerInsights, Platform, Weekday } from '@/types/api';

function Chips<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: (v: T) => string }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-lg">
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            className={`mr-sm min-h-10 justify-center rounded-full px-md ${selected ? 'bg-navy' : 'bg-neutral-100'}`}
          >
            <Text className={`text-label ${selected ? 'font-semibold text-white' : 'text-navy'}`}>{label(option)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function AddSheet({ visible, onClose, onAdded, initialDay, initialTime }: { visible: boolean; onClose: () => void; onAdded: () => void; initialDay?: Weekday; initialTime?: string }) {
  const [title, setTitle] = useState('');
  const [day, setDay] = useState<Weekday>(initialDay ?? 'Monday');
  const [time, setTime] = useState(initialTime ?? '');
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [contentType, setContentType] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const normalised = normaliseTime(time);
    if (!title.trim() || !normalised) {
      setError(title.trim() ? 'Enter a time like 6:00 PM.' : 'Add a title and a time.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addPlannedItem({ title: title.trim(), day, time: normalised, platform, ...(contentType.trim() && { contentType: contentType.trim() }) });
      setTitle('');
      setTime('');
      setContentType('');
      onAdded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Plan a post" closeLabel="Cancel">
      {error ? <Notice variant="error" message={error} /> : null}
      <TextField label="Title" value={title} onChangeText={setTitle} maxLength={300} placeholder="What will you post?" />
      <Text className="mb-xs text-label text-navy">Day</Text>
      <Chips options={DAY_NAMES} value={day} onChange={setDay} label={(d) => d.slice(0, 3)} />
      <TextField label="Time" value={time} onChangeText={setTime} maxLength={20} placeholder="6:00 PM" />
      <Text className="mb-xs text-label text-navy">Platform</Text>
      <Chips options={PLATFORM_ORDER} value={platform} onChange={setPlatform} label={(p) => PLATFORM_META[p].name} />
      <TextField label="Content type (optional)" value={contentType} onChangeText={setContentType} maxLength={30} placeholder="e.g. reel" />
      <Button title="Save" onPress={() => void save()} loading={saving} />
    </BottomSheet>
  );
}

function InsightsView({ insights }: { insights: PlannerInsights }) {
  if (!insights.hasEnoughData) {
    return (
      <Notice
        variant="info"
        title="Not enough history yet"
        message={`Best times are measured from your own posts (${insights.basedOn.posts} analysed so far). They appear once more posts have synced.`}
      />
    );
  }
  return (
    <>
      {insights.bestWindows.length > 0 ? (
        <Card title="Best times to post" description={`${insights.basedOn.method} · ${insights.timezone}`}>
          {insights.bestWindows.map((w) => (
            <KeyValue key={`${w.day}:${w.timeSlot}`} label={`${w.day} ${w.timeOfDay} (${w.timeSlot}) · ${w.sampleCount} posts`} value={formatPercent(w.meanEngagementRate, 2)} />
          ))}
        </Card>
      ) : null}
      {insights.recommendedFormats.length > 0 ? (
        <Card title="Formats that work">
          {insights.recommendedFormats.map((f) => (
            <KeyValue key={`${f.platform}:${f.contentType}`} label={`${PLATFORM_META[f.platform].name} ${f.contentType} · ${f.count}`} value={formatPercent(f.medianEngagementRate, 2)} />
          ))}
        </Card>
      ) : null}
      {insights.topTopics.length > 0 ? (
        <Card title="Top topics">
          {insights.topTopics.map((t) => (
            <KeyValue key={t.topic} label={`${t.topic} · ${t.count} posts`} value={formatPercent(t.medianEngagementRate, 2)} />
          ))}
        </Card>
      ) : null}
    </>
  );
}

function PlannedRow({ item, onRemove }: { item: PlannedItem; onRemove: () => void }) {
  return (
    <View className="flex-row items-center py-sm">
      <PlatformLogo platform={item.platform} size={32} />
      <View className="ml-md flex-1">
        <Text className="text-label text-navy" numberOfLines={2}>
          {item.title}
        </Text>
        <Text className="mt-0.5 text-caption text-neutral-500">{`${item.day} · ${item.time}${item.contentType ? ` · ${item.contentType}` : ''} · ${item.status}`}</Text>
      </View>
      <IconButton icon="trash-outline" accessibilityLabel={`Remove ${item.title}`} onPress={onRemove} color={colors.danger} />
    </View>
  );
}

const loadPlanner = () => Promise.all([fetchPlannerInsights(), fetchPlannedItems()]);

export default function PlannerScreen() {
  const { state, refreshing, reload, refresh } = useApiResource(loadPlanner);
  // "Plan a post" on Best times opens the add sheet with that day and time (as the web planner does).
  const params = useLocalSearchParams<{ day?: string; time?: string }>();
  const prefillDay = DAY_NAMES.find((d) => d === params.day);
  const [adding, setAdding] = useState(Boolean(prefillDay || params.time));
  const [seen, setSeen] = useState(`${params.day}|${params.time}`);
  if (seen !== `${params.day}|${params.time}`) {
    setSeen(`${params.day}|${params.time}`);
    if (prefillDay || params.time) setAdding(true);
  }

  const confirmRemove = (item: PlannedItem) =>
    Alert.alert('Remove this post?', item.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removePlannedItem(item.id);
            await refresh();
          } catch (e) {
            Alert.alert('Unable to remove', e instanceof Error ? e.message : 'Please try again.');
          }
        },
      },
    ]);

  return (
    <TabScreen showLogo title="Planner" subtitle="Plan posts around the times that work for you." refreshing={refreshing} onRefresh={refresh}>
      {state.status === 'loading' ? (
        <LoadingState message="Loading planner…" />
      ) : state.status !== 'success' ? (
        <ErrorState message={state.message} onRetry={reload} />
      ) : (
        <>
          <InsightsView insights={state.data[0]} />
          <Card title="Planned posts" right={<Button title="Add" size="sm" icon="add" variant="ghost" onPress={() => setAdding(true)} />}>
            {state.data[1].length === 0 ? (
              <Text className="text-label font-normal text-neutral-500">Nothing planned yet.</Text>
            ) : (
              state.data[1].map((item) => <PlannedRow key={item.id} item={item} onRemove={() => confirmRemove(item)} />)
            )}
          </Card>
        </>
      )}
      <AddSheet key={seen} visible={adding} onClose={() => setAdding(false)} onAdded={() => void refresh()} initialDay={prefillDay} initialTime={params.time} />
    </TabScreen>
  );
}
